const Alumni = require("../Models/Alumni");
const mongoose = require("mongoose");
const Job = require("../Models/Job");
const Plan = require("../Models/Plan");
const Profile = require("../Models/Profile");
const SavedJob = require("../Models/SavedJob");
const { buildPlan, calculatePlanStreak, calculateProgress, cleanTarget, extractCurrentStage, needsRecalculation } = require("../services/planService");
const { analyzeJobMatch } = require("../services/jobMatchingService");
const { nextBestAction } = require("../services/studentIntelligence/nextBestActionService");
const { analyzeCurrentStage } = require("../services/ai/currentStageAnalysis");

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

async function loadTargetJobContexts(userId, profile, target, strict = true) {
  const requestedIds = [...new Set((target.jobIds || []).map(String))].filter(mongoose.isValidObjectId).slice(0, 5);
  if (!requestedIds.length) {
    if (strict && target.mode === "job") { const error = new Error("Choose at least one saved target job for a Job Roadmap."); error.status = 400; throw error; }
    return [];
  }
  const saved = await SavedJob.find({ userId, jobId: { $in: requestedIds }, status: { $in: ["saved", "planning", "applied", "interview"] } }).lean();
  const allowed = new Set(saved.map((item) => String(item.jobId)));
  const jobs = await Job.find({ _id: { $in: requestedIds.filter((id) => allowed.has(id)) }, active: true, "verification.status": { $nin: ["rejected", "expired"] } }).lean();
  if (strict && target.mode === "job" && !jobs.length) { const error = new Error("The selected target jobs are no longer available in your saved jobs."); error.status = 400; throw error; }
  return jobs.map((job) => ({ job, match: analyzeJobMatch(profile, job) }));
}

function sameGoal(left, right) {
  const date = (value) => value ? new Date(value).toISOString().slice(0, 10) : "";
  const ids = (target) => (target.jobIds || []).map(String).sort().join(",");
  return (left.mode || "role") === (right.mode || "role") && left.type === right.type && left.role === right.role && (left.company || "") === (right.company || "") && ids(left) === ids(right) && date(left.deadline) === date(right.deadline) && Number(left.weeklyHours) === Number(right.weeklyHours);
}

function serialize(plan, options = {}) {
  const value = plan.toObject ? plan.toObject() : plan;
  const start = new Date(value.timeline.startDate || value.createdAt || Date.now());
  const currentWeek = Math.max(1, Math.min(value.timeline.estimatedWeeks, Math.floor((Date.now() - start.getTime()) / 604800000) + 1));
  let currentPhase = value.phases.find((phase) => currentWeek >= phase.startWeek && currentWeek <= phase.endWeek) || value.phases.at(-1) || null;
  let phaseIndex = value.phases.findIndex((phase) => phase.id === currentPhase?.id);
  while (phaseIndex >= 0 && phaseIndex < value.phases.length - 1) {
    const phaseTasks = value.tasks.filter((task) => !task.archived && task.phaseId === value.phases[phaseIndex].id);
    if (!phaseTasks.length || !phaseTasks.every((task) => task.completed || task.status === "completed" || task.status === "skipped")) break;
    phaseIndex += 1;
    currentPhase = value.phases[phaseIndex];
  }
  return { ...value, currentWeek, currentPhase, needsRecalculation: Boolean(options.needsRecalculation), recalculated: Boolean(options.recalculated) };
}

async function saveGenerated(userId, profile, alumni, target, existing, jobContexts = []) {
  const generated = buildPlan({ ...profile, userId }, alumni, target, existing, jobContexts);
  return Plan.findOneAndUpdate({ userId }, { $set: generated }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
}

function profileSignals(profile, target) {
  const signals = [];
  if (profile.graduationYear) signals.push(`${profile.graduationYear}-year ${profile.branch || "student"}`);
  else if (profile.branch) signals.push(`${profile.branch} student`);
  signals.push(`${target.type.replaceAll("-", " ")} selected as primary goal`);
  if (Number.isFinite(profile.projects)) signals.push(`${profile.projects} project${profile.projects === 1 ? "" : "s"} already completed`);
  if (profile.githubStats?.username) signals.push("GitHub connected");
  if (profile.leetcodeStats?.username) signals.push("LeetCode connected");
  if (Number.isFinite(profile.cgpa)) signals.push(`Current CGPA: ${profile.cgpa}`);
  return signals;
}

exports.previewMyPlanContext = async (req, res, next) => {
  try {
    const { profile } = await loadPlanningContext(req.auth.id);
    const input = req.body.target || req.body;
    const target = cleanTarget(input, profile);
    if (!target.role) return res.status(400).json({ message: "Choose a target role or target job to build a personalized roadmap." });
    const jobContexts = await loadTargetJobContexts(req.auth.id, profile, target);
    const selfAssessment = {
      currentStageStory: String(input.currentStageStory || "").trim().slice(0, 8000),
      blockers: Array.isArray(input.blockers) ? input.blockers : [],
      completedAreas: Array.isArray(input.completedAreas) ? input.completedAreas : [],
    };
    const fallback = extractCurrentStage(selfAssessment);
    const interpretation = await analyzeCurrentStage({ profile, target, selfAssessment, fallback });
    return res.json({ preview: { profileSignals: profileSignals(profile, target), goal: target, targetJobs: jobContexts.map(({ job }) => ({ id: String(job._id), title: job.title, company: job.company })), understoodCurrentStage: interpretation.analysis, analysisSource: interpretation.source } });
  } catch (error) { return next(error); }
};

exports.getMyPlan = async (req, res, next) => {
  try {
    let plan = await Plan.findOne({ userId: req.auth.id });
    if (!plan) return res.json({ plan: null });
    const { profile } = await loadPlanningContext(req.auth.id);
    const jobContexts = await loadTargetJobContexts(req.auth.id, profile, plan.target, false);
    return res.json({ plan: serialize(plan, { needsRecalculation: needsRecalculation(plan, profile, jobContexts) }) });
  } catch (error) { return next(error); }
};

exports.generateMyPlan = async (req, res, next) => {
  try {
    const { profile, alumni } = await loadPlanningContext(req.auth.id);
    const sourceTarget = req.body.target || req.body;
    const target = cleanTarget(sourceTarget, profile);
    if (!target.role) return res.status(400).json({ message: "Choose a target role or target job to build a personalized roadmap." });
    const jobContexts = await loadTargetJobContexts(req.auth.id, profile, target);
    const existing = await Plan.findOne({ userId: req.auth.id });
    if (existing && !sameGoal(existing.target, target) && req.body.confirmReplace !== true) {
      return res.status(409).json({ message: "You already have an active plan. Confirm that you want to update its goal.", requiresConfirmation: true });
    }
    const plan = await saveGenerated(req.auth.id, profile, alumni, { ...sourceTarget, ...target }, existing, jobContexts);
    return res.status(existing ? 200 : 201).json({ plan: serialize(plan) });
  } catch (error) { return next(error); }
};

exports.recalculateMyPlan = async (req, res, next) => {
  try {
    const existing = await Plan.findOne({ userId: req.auth.id });
    if (!existing) return res.status(404).json({ message: "Build a plan before recalculating it." });
    const { profile, alumni } = await loadPlanningContext(req.auth.id);
    const target = existing.target.toObject ? existing.target.toObject() : existing.target;
    const jobContexts = await loadTargetJobContexts(req.auth.id, profile, target);
    const plan = await saveGenerated(req.auth.id, profile, alumni, target, existing, jobContexts);
    return res.json({ plan: serialize(plan, { recalculated: true }) });
  } catch (error) { return next(error); }
};

exports.updateTask = async (req, res, next) => {
  try {
    const plan = await Plan.findOne({ userId: req.auth.id });
    if (!plan) return res.status(404).json({ message: "Plan not found." });
    const task = plan.tasks.find((item) => item.id === req.params.taskId && !item.archived);
    if (!task) return res.status(404).json({ message: "Task not found in your active plan." });
    const requestedStatus = req.body.status || (typeof req.body.completed === "boolean" ? (req.body.completed ? "completed" : "not_started") : task.status === "completed" ? "not_started" : "completed");
    if (!["not_started", "in_progress", "completed", "skipped"].includes(requestedStatus)) return res.status(400).json({ message: "Choose a valid roadmap task status." });
    task.status = requestedStatus; task.completed = requestedStatus === "completed";
    task.completedAt = requestedStatus === "completed" ? task.completedAt || new Date() : null;
    task.skippedAt = requestedStatus === "skipped" ? task.skippedAt || new Date() : null;
    const progress = calculateProgress(plan.tasks);
    plan.progress = { ...progress, streak: calculatePlanStreak(plan.tasks) };
    plan.nextBestAction = nextBestAction(plan.tasks);
    plan.markModified("tasks");
    plan.markModified("progress");
    await plan.save();
    return res.json({ plan: serialize(plan) });
  } catch (error) { return next(error); }
};

exports.listRoadmapTargetJobs = async (req, res, next) => {
  try {
    const saved = await SavedJob.find({ userId: req.auth.id, status: { $in: ["saved", "planning", "applied", "interview"] } }).sort({ updatedAt: -1 }).lean();
    const jobs = await Job.find({ _id: { $in: saved.map((item) => item.jobId) }, active: true, "verification.status": { $nin: ["rejected", "expired"] } }).lean();
    const savedByJob = new Map(saved.map((item) => [String(item.jobId), item.status]));
    return res.json({ jobs: jobs.map((job) => ({ id: String(job._id), title: job.title, company: job.company, location: job.location, employmentType: job.employmentType, status: savedByJob.get(String(job._id)), requirementCount: job.jdAnalysis?.requirements?.length || 0 })) });
  } catch (error) { return next(error); }
};
