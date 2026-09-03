const Alumni = require("../Models/Alumni");
const ImprovementPlan = require("../Models/ImprovementPlan");
const Plan = require("../Models/Plan");
const Profile = require("../Models/Profile");
const { publicAlumniQuery, serializePublicAlumni } = require("../services/alumniPublicService");
const { activeGoal, buildBenchmark, findRelevantAlumni, pathsForGoal } = require("../services/alumniMatchingService");
const { buildEffectiveSkillInventory } = require("../services/skillEvidenceService");
const { normalizeSkill, skillLabel } = require("../services/skillNormalizationService");
const { generateImprovementPlan, progress, studentEvidence } = require("../services/improvementPlanService");
const { buildEvidenceReadiness } = require("../services/evidenceReadinessService");

async function contextFor(userId) {
  const [profile, roadmap] = await Promise.all([Profile.findOne({ userId }).lean(), Plan.findOne({ userId }).lean()]);
  if (!profile) { const error = new Error("Complete your profile before improving a skill."); error.status = 404; throw error; }
  const goal = activeGoal(profile, roadmap);
  const alumni = (await Alumni.find(publicAlumniQuery({
    $or: [{ careerPaths: { $in: pathsForGoal(goal).map((path) => path === "psu" ? "gate" : path) } }, { path: { $in: pathsForGoal(goal) } }, { outcomeType: { $in: pathsForGoal(goal) } }],
  })).lean()).map(serializePublicAlumni);
  const ranked = findRelevantAlumni(profile, alumni, { profile, plan: roadmap, goal, target: roadmap?.target || { role: profile.targetRole || "" } });
  return { profile, roadmap, closest: ranked.slice(0, 5), benchmark: buildBenchmark(profile, ranked.slice(0, 5)) };
}

function candidateSkills(context) {
  const candidates = new Map();
  const add = (skill, importance, reason, cohortPercent = null) => {
    const id = normalizeSkill(skill);
    if (!id) return;
    const current = candidates.get(id);
    if (!current || importance === "critical") candidates.set(id, { skill: skillLabel(skill), skillId: id, importance, reason, cohortPercent });
  };
  for (const gap of context.roadmap?.prioritizedGaps || []) add(gap.item, gap.priority === "high" ? "critical" : "recommended", gap.reasons?.[0] || "This is an active target gap.");
  for (const entry of context.closest[0]?.missingSkills || []) add(entry.skill || entry, entry.importance || "recommended", entry.reason || "This skill is missing from your current evidence compared with a similar senior.", entry.cohortPercent || null);
  for (const item of context.benchmark?.commonSkills || []) add(item.skill, item.percent >= 60 ? "critical" : "recommended", `Found in ${item.percent}% of your closest senior preparation paths.`, item.percent);
  const inventory = buildEffectiveSkillInventory(context.profile, { targetRole: context.profile.targetRole });
  return [...candidates.values()].filter((candidate) => !studentEvidence(context.profile, candidate.skillId).verified).slice(0, 3);
}

async function synchronizeVerifiedPlans(userId, profile) {
  const activePlans = await ImprovementPlan.find({ userId, status: { $ne: "verified" } });
  const readiness = buildEvidenceReadiness(profile);
  await Promise.all(activePlans.map(async (plan) => {
    if (!studentEvidence(profile, plan.skillId).verified) return;
    plan.status = "verified";
    plan.lastReadiness = readiness;
    await plan.save();
  }));
  return readiness;
}

function serialize(plan) {
  const value = plan.toObject ? plan.toObject() : plan;
  return { ...value, id: String(value._id), progressPercent: progress(value.tasks || []) };
}

async function currentOrGenerated(userId, skill) {
  const context = await contextFor(userId);
  const skillId = normalizeSkill(skill);
  const existing = skillId ? await ImprovementPlan.findOne({ userId, skillId }) : null;
  const generated = generateImprovementPlan({ profile: context.profile, skill, alumni: context.closest.map((item) => item.alumni), existingPlan: existing?.toObject?.() || existing });
  return { context, existing, generated };
}

exports.getNextUnlocks = async (req, res, next) => {
  try {
    const context = await contextFor(req.auth.id);
    const readiness = await synchronizeVerifiedPlans(req.auth.id, context.profile);
    const candidates = candidateSkills(context);
    const saved = candidates.length ? await ImprovementPlan.find({ userId: req.auth.id, skillId: { $in: candidates.map((item) => item.skillId) } }).lean() : [];
    const bySkill = new Map(saved.map((item) => [item.skillId, item]));
    return res.json({ readiness, unlocks: candidates.map((candidate) => {
      const plan = bySkill.get(candidate.skillId);
      const generated = generateImprovementPlan({ profile: context.profile, skill: candidate.skillName, alumni: context.closest.map((item) => item.alumni), existingPlan: plan });
      return { ...candidate, plan: plan ? serialize({ ...plan, ...generated }) : null, evidenceStatus: generated.status, studentEvidence: generated.reason.studentEvidenceStatus, alumniMatch: generated.reason.alumniMatch, targetRequirement: generated.reason.targetRequirement };
    }) });
  } catch (error) { return next(error); }
};

exports.previewImprovementPlan = async (req, res, next) => {
  try {
    const { existing, generated } = await currentOrGenerated(req.auth.id, req.body.skill);
    return res.json({ plan: existing ? serialize({ ...existing.toObject(), ...generated }) : generated, existing: Boolean(existing) });
  } catch (error) { return next(error); }
};

exports.createImprovementPlan = async (req, res, next) => {
  try {
    const { context, existing, generated } = await currentOrGenerated(req.auth.id, req.body.skill);
    if (existing) return res.json({ plan: serialize({ ...existing.toObject(), ...generated }), existing: true, message: `${generated.skillName} is already in your roadmap.` });
    const created = await ImprovementPlan.create({ userId: req.auth.id, ...generated, roadmapPlanId: context.roadmap?._id || null, addedToRoadmapAt: new Date(), status: generated.status === "verified" ? "verified" : "in_progress" });
    return res.status(201).json({ plan: serialize(created), existing: false, message: `${generated.skillName} improvement plan added to your roadmap.` });
  } catch (error) {
    if (error?.code === 11000) {
      const existing = await ImprovementPlan.findOne({ userId: req.auth.id, skillId: normalizeSkill(req.body.skill) });
      return res.json({ plan: serialize(existing), existing: true, message: `${existing.skillName} is already in your roadmap.` });
    }
    return next(error);
  }
};

exports.getImprovementPlan = async (req, res, next) => {
  try {
    const plan = await ImprovementPlan.findOne({ _id: req.params.planId, userId: req.auth.id });
    if (!plan) return res.status(404).json({ message: "Improvement plan not found." });
    return res.json({ plan: serialize(plan) });
  } catch (error) { return next(error); }
};

exports.updateImprovementTask = async (req, res, next) => {
  try {
    const plan = await ImprovementPlan.findOne({ _id: req.params.planId, userId: req.auth.id });
    if (!plan) return res.status(404).json({ message: "Improvement plan not found." });
    const task = plan.tasks.find((item) => item.id === req.params.taskId);
    if (!task) return res.status(404).json({ message: "Improvement task not found." });
    if (typeof req.body.completed !== "boolean") return res.status(400).json({ message: "completed must be true or false." });
    task.completed = req.body.completed;
    task.completedAt = req.body.completed ? task.completedAt || new Date() : null;
    plan.progressPercent = progress(plan.tasks);
    if (plan.status !== "verified" && plan.status !== "evidence_submitted") plan.status = "in_progress";
    plan.markModified("tasks");
    await plan.save();
    return res.json({ plan: serialize(plan) });
  } catch (error) { return next(error); }
};

exports.submitEvidence = async (req, res, next) => {
  try {
    const plan = await ImprovementPlan.findOne({ _id: req.params.planId, userId: req.auth.id });
    if (!plan) return res.status(404).json({ message: "Improvement plan not found." });
    const type = String(req.body.type || "").trim();
    const url = String(req.body.url || "").trim();
    if (!type) return res.status(400).json({ message: "Choose an evidence type." });
    if (url && !/^https:\/\//i.test(url)) return res.status(400).json({ message: "Evidence links must use https." });
    plan.evidence.push({ type, url: url || null, note: String(req.body.note || "").trim().slice(0, 500), submittedAt: new Date(), verification: "pending" });
    plan.status = "evidence_submitted";
    plan.markModified("evidence");
    await plan.save();
    return res.status(201).json({ plan: serialize(plan), message: "Evidence submitted. It is not verified until Newbert can validate a supported source." });
  } catch (error) { return next(error); }
};
