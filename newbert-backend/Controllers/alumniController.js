const Alumni = require("../Models/Alumni");
const Profile = require("../Models/Profile");
const Plan = require("../Models/Plan");
const { activeGoal, buildBenchmark, buildComparison, findClosestSeniors, findRelevantAlumni, pathsForGoal } = require("../services/alumniMatchingService");

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
  const alumni = await Alumni.find({ verified: true, $or: [{ path: { $in: pathsForGoal(context.goal) } }, { outcomeType: { $in: pathsForGoal(context.goal) } }] }).lean();
  const ranked = findRelevantAlumni(context.profile, alumni, context);
  return { ...context, ranked };
}

exports.listAlumni = async (req, res, next) => {
  try {
    const query = { verified: true };
    if (req.query.college?.trim()) query.college = { $regex: `^${req.query.college.trim()}$`, $options: "i" };
    res.json({ alumni: await Alumni.find(query).sort({ createdAt: -1 }).lean() });
  } catch (error) { next(error); }
};

exports.getAlumni = async (req, res, next) => {
  try {
    const alumni = await Alumni.findOne({ _id: req.params.id, verified: true }).lean();
    if (!alumni) return res.status(404).json({ message: "Alumni profile not found." });
    res.json({ alumni });
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
    const [context, alumni] = await Promise.all([loadStudentContext(req.auth.id), Alumni.findOne({ _id: req.params.id, verified: true }).lean()]);
    if (!alumni) return res.status(404).json({ message: "Alumni profile not found." });
    return res.json({ comparison: buildComparison(context.profile, alumni, context) });
  } catch (error) { return next(error); }
};
