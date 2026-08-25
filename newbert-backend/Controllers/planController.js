const Alumni = require("../Models/Alumni");
const Plan = require("../Models/Plan");
const Profile = require("../Models/Profile");
const { buildPlan, calculatePlanStreak, calculateProgress, cleanTarget, needsRecalculation } = require("../services/planService");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function loadPlanningContext(userId) {
  const profile = await Profile.findOne({ userId }).lean();
  if (!profile?.college || !profile?.branch) {
    const error = new Error("Complete your college and branch before building a plan.");
    error.status = 400;
    throw error;
  }
  const alumni = await Alumni.find({ college: { $regex: `^${escapeRegex(profile.college)}$`, $options: "i" }, verified: true }).lean();
  return { profile, alumni };
}

function sameGoal(left, right) {
  const date = (value) => value ? new Date(value).toISOString().slice(0, 10) : "";
  return left.type === right.type && left.role === right.role && (left.company || "") === (right.company || "") && date(left.deadline) === date(right.deadline) && Number(left.weeklyHours) === Number(right.weeklyHours);
}

function serialize(plan, options = {}) {
  const value = plan.toObject ? plan.toObject() : plan;
  const start = new Date(value.timeline.startDate || value.createdAt || Date.now());
  const currentWeek = Math.max(1, Math.min(value.timeline.estimatedWeeks, Math.floor((Date.now() - start.getTime()) / 604800000) + 1));
  const currentPhase = value.phases.find((phase) => currentWeek >= phase.startWeek && currentWeek <= phase.endWeek) || value.phases.at(-1) || null;
  return { ...value, currentWeek, currentPhase, needsRecalculation: false, recalculated: Boolean(options.recalculated) };
}

async function saveGenerated(userId, profile, alumni, target, existing) {
  const generated = buildPlan({ ...profile, userId }, alumni, target, existing);
  return Plan.findOneAndUpdate({ userId }, { $set: generated }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
}

exports.getMyPlan = async (req, res, next) => {
  try {
    let plan = await Plan.findOne({ userId: req.auth.id });
    if (!plan) return res.json({ plan: null });
    const { profile, alumni } = await loadPlanningContext(req.auth.id);
    let recalculated = false;
    if (needsRecalculation(plan, profile)) {
      plan = await saveGenerated(req.auth.id, profile, alumni, plan.target.toObject ? plan.target.toObject() : plan.target, plan);
      recalculated = true;
    }
    return res.json({ plan: serialize(plan, { recalculated }) });
  } catch (error) { return next(error); }
};

exports.generateMyPlan = async (req, res, next) => {
  try {
    const { profile, alumni } = await loadPlanningContext(req.auth.id);
    const target = cleanTarget(req.body.target || req.body, profile);
    if (!target.role) return res.status(400).json({ message: "Choose a target role." });
    const existing = await Plan.findOne({ userId: req.auth.id });
    if (existing && !sameGoal(existing.target, target) && req.body.confirmReplace !== true) {
      return res.status(409).json({ message: "You already have an active plan. Confirm that you want to update its goal.", requiresConfirmation: true });
    }
    const plan = await saveGenerated(req.auth.id, profile, alumni, target, existing);
    return res.status(existing ? 200 : 201).json({ plan: serialize(plan) });
  } catch (error) { return next(error); }
};

exports.recalculateMyPlan = async (req, res, next) => {
  try {
    const existing = await Plan.findOne({ userId: req.auth.id });
    if (!existing) return res.status(404).json({ message: "Build a plan before recalculating it." });
    const { profile, alumni } = await loadPlanningContext(req.auth.id);
    const plan = await saveGenerated(req.auth.id, profile, alumni, existing.target.toObject ? existing.target.toObject() : existing.target, existing);
    return res.json({ plan: serialize(plan, { recalculated: true }) });
  } catch (error) { return next(error); }
};

exports.updateTask = async (req, res, next) => {
  try {
    const plan = await Plan.findOne({ userId: req.auth.id });
    if (!plan) return res.status(404).json({ message: "Plan not found." });
    const task = plan.tasks.find((item) => item.id === req.params.taskId && !item.archived);
    if (!task) return res.status(404).json({ message: "Task not found in your active plan." });
    const completed = typeof req.body.completed === "boolean" ? req.body.completed : !task.completed;
    task.completed = completed;
    task.completedAt = completed ? new Date() : null;
    const progress = calculateProgress(plan.tasks);
    plan.progress = { ...progress, streak: calculatePlanStreak(plan.tasks) };
    plan.markModified("tasks");
    plan.markModified("progress");
    await plan.save();
    return res.json({ plan: serialize(plan) });
  } catch (error) { return next(error); }
};
