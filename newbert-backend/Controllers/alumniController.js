const Alumni = require("../Models/Alumni");
const Profile = require("../Models/Profile");
const Plan = require("../Models/Plan");
const { activeGoal, buildBenchmark, buildComparison, findClosestSeniors, findRelevantAlumni, pathsForGoal } = require("../services/alumniMatchingService");
const { publicAlumniQuery, serializePublicAlumni } = require("../services/alumniPublicService");
const { buildSkillEvidence } = require("../services/skillEvidenceService");

function skillEvidenceComparison(student, alumni) {
  const mine = buildSkillEvidence(student); const senior = buildSkillEvidence({ skills: alumni.skills || [], projectDetails: alumni.projectsDetail || [], githubStats: alumni.github || null, leetcodeStats: alumni.leetcode || null });
  const mineBySkill = new Map(mine.skills.map((item) => [item.normalizedSkill, item])); const seniorBySkill = new Map(senior.skills.map((item) => [item.normalizedSkill, item]));
  const skills = [...new Set([...mineBySkill.keys(), ...seniorBySkill.keys()])].map((key) => { const studentSkill = mineBySkill.get(key); const seniorSkill = seniorBySkill.get(key); return { skill: studentSkill?.skill || seniorSkill?.skill || key, student: studentSkill ? { score: studentSkill.score, level: studentSkill.level, confidence: studentSkill.confidence } : { score: null, level: "unavailable", confidence: 0 }, senior: seniorSkill ? { score: seniorSkill.score, level: seniorSkill.level, confidence: seniorSkill.confidence } : { score: null, level: "unavailable", confidence: 0 }, gap: studentSkill && seniorSkill ? Math.max(0, seniorSkill.score - studentSkill.score) : null }; }).sort((a, b) => (b.gap ?? -1) - (a.gap ?? -1));
  return { skills, studentLeetcodeTopics: mine.leetcode, seniorLeetcodeTopics: senior.leetcode, limitations: [...mine.limitations, ...senior.limitations] };
}

async function loadStudentContext(userId) {
  const [profile, plan] = await Promise.all([Profile.findOne({ userId }).lean(), Plan.findOne({ userId }).lean()]);
  if (!profile) {
    const error = new Error("Complete your profile before using personalized alumni matching.");
    error.status = 400;
    throw error;
  }
  const goal = activeGoal(profile, plan);
  return { profile, plan, goal, target: plan?.target || { role: profile.targetRole || "" }, stage: plan?.understoodCurrentStage || {} };
}

async function relevantRanking(userId) {
  const context = await loadStudentContext(userId);
  const alumni = (await Alumni.find(publicAlumniQuery({ $or: [{ careerPaths: { $in: pathsForGoal(context.goal).map((path) => path === "psu" ? "gate" : path) } }, { path: { $in: pathsForGoal(context.goal) } }, { outcomeType: { $in: pathsForGoal(context.goal) } }] })).lean()).map(serializePublicAlumni);
  const ranked = findRelevantAlumni(context.profile, alumni, context);
  return { ...context, ranked };
}

exports.listAlumni = async (req, res, next) => {
  try {
    const query = publicAlumniQuery();
    if (req.query.college?.trim()) query.college = { $regex: `^${req.query.college.trim()}$`, $options: "i" };
    res.json({ alumni: (await Alumni.find(query).sort({ createdAt: -1 }).lean()).map(serializePublicAlumni) });
  } catch (error) { next(error); }
};

exports.getAlumni = async (req, res, next) => {
  try {
    const alumni = await Alumni.findOne(publicAlumniQuery({ _id: req.params.id })).lean();
    if (!alumni) return res.status(404).json({ message: "Alumni profile not found." });
    res.json({ alumni: serializePublicAlumni(alumni) });
  } catch (error) { next(error); }
};

exports.getRecommendedAlumni = async (req, res, next) => {
  try {
    const { goal, ranked } = await relevantRanking(req.auth.id);
    const sort = req.query.sort || "relevant";
    const results = [...ranked];
    if (sort === "package") results.sort((a, b) => Number(b.alumni.placement?.packageLpa ?? b.alumni.package ?? 0) - Number(a.alumni.placement?.packageLpa ?? a.alumni.package ?? 0));
    if (sort === "recent") results.sort((a, b) => new Date(b.alumni.createdAt) - new Date(a.alumni.createdAt));
    if (sort === "air") results.sort((a, b) => Number(a.alumni.gate?.air ?? a.alumni.gateAIR ?? Infinity) - Number(b.alumni.gate?.air ?? b.alumni.gateAIR ?? Infinity));
    return res.json({ goal, recommended: results });
  } catch (error) { return next(error); }
};

exports.getClosestAlumni = async (req, res, next) => {
  try {
    const { profile, goal, ranked } = await relevantRanking(req.auth.id);
    return res.json({ goal, closest: ranked.slice(0, Math.min(10, Math.max(1, Number(req.query.limit) || 3))), benchmark: buildBenchmark(profile, ranked) });
  } catch (error) { return next(error); }
};

exports.getAlumniBenchmark = async (req, res, next) => {
  try {
    const { profile, goal, ranked } = await relevantRanking(req.auth.id);
    return res.json({ goal, benchmark: buildBenchmark(profile, ranked) });
  } catch (error) { return next(error); }
};

exports.compareAlumni = async (req, res, next) => {
  try {
    const [context, alumniRecord] = await Promise.all([loadStudentContext(req.auth.id), Alumni.findOne(publicAlumniQuery({ _id: req.params.id })).lean()]);
    const alumni = alumniRecord ? serializePublicAlumni(alumniRecord) : null;
    if (!alumni) return res.status(404).json({ message: "Alumni profile not found." });
    return res.json({ comparison: buildComparison(context.profile, alumni, { ...context, requestedPath: ["placement", "gate"].includes(req.query.path) ? req.query.path : null }), evidenceComparison: skillEvidenceComparison(context.profile, alumni) });
  } catch (error) { return next(error); }
};

exports.useAlumniPathInRoadmap = async (req, res, next) => {
  try {
    const [context, alumniRecord] = await Promise.all([loadStudentContext(req.auth.id), Alumni.findOne(publicAlumniQuery({ _id: req.params.id })).lean()]);
    const alumni = alumniRecord ? serializePublicAlumni(alumniRecord) : null;
    if (!alumni) return res.status(404).json({ message: "Alumni profile not found." });
    if (!context.plan) return res.status(400).json({ message: "Build your roadmap before adding alumni evidence." });
    const comparison = buildComparison(context.profile, alumni, { ...context, requestedPath: ["placement", "gate"].includes(req.body.path) ? req.body.path : null });
    const supportedDimensions = comparison.dimensions.filter((item) => item.student.value != null && item.alumni.value != null && (typeof item.student.value !== "number" || item.alumni.value > item.student.value)).map((item) => ({ key: item.key, label: item.label, studentValue: item.student.value, alumniValue: item.alumni.value }));
    const signal = { alumniId: alumni._id, alumniName: alumni.name, path: comparison.path, confidence: comparison.confidence, similarityBand: comparison.similarity.band, supportedDimensions, differences: comparison.differences.slice(0, 5), createdAt: new Date() };
    const alumniSignals = [...(context.plan.alumniSignals || []).filter((item) => String(item.alumniId) !== String(alumni._id) || item.path !== comparison.path), signal].slice(-10);
    await Plan.findOneAndUpdate({ userId: req.auth.id }, { $set: { alumniSignals } }, { runValidators: true });
    return res.json({ message: "Supported alumni evidence added to your roadmap context.", signal });
  } catch (error) { return next(error); }
};
