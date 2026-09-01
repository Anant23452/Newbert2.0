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
const { sameCollegeQuery } = require("../services/collegeService");
const { resolveTargetBenchmark } = require("../services/targetBenchmarkService");

async function loadPlanningContext(userId) {
  const profile = await Profile.findOne({ userId }).lean();
  if (!profile?.college || !profile?.branch) {
    const error = new Error("Complete your college and branch before building a plan.");
    error.status = 400;
    throw error;
  }
  const alumni = await Alumni.find({
    verified: true, isDummyData: { $ne: true }, "privacy.profile": { $ne: false },
    $or: [sameCollegeQuery(profile), { company: { $ne: null } }, { "placement.company": { $ne: null } }],
  }).sort({ createdAt: -1 }).limit(250).lean();
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
  return (left.mode || "role") === (right.mode || "role") && (left.targetType || (left.company ? "specific_company" : "role_only")) === right.targetType && left.type === right.type && left.role === right.role && (left.company || "") === (right.company || "") && (left.companyCategory || "") === (right.companyCategory || "") && (left.region || "") === (right.region || "") && ids(left) === ids(right) && date(left.deadline) === date(right.deadline) && (left.weeklyHours ?? null) === (right.weeklyHours ?? null);
}

function normalizePlanDocument(value) {
  // Guarantee every field the frontend destructures actually exists.
  // Old MongoDB documents may be missing fields added in later schema versions.
  // These defaults must never overwrite real data — they only fill absent fields.

  // tasks / phases / gaps ­— always arrays
  const tasks = Array.isArray(value.tasks) ? value.tasks : [];
  const phases = Array.isArray(value.phases) ? value.phases : [];
  const gaps = Array.isArray(value.gaps) ? value.gaps : [];

  // readiness.categories — the field that produced the production crash.
  // Old plans stored readiness as { total: N } without a categories sub-object.
  const rawReadiness = value.readiness && typeof value.readiness === "object" ? value.readiness : {};
  const readiness = {
    ...rawReadiness,
    total: rawReadiness.total ?? null,
    categories:
      rawReadiness.categories &&
      typeof rawReadiness.categories === "object" &&
      !Array.isArray(rawReadiness.categories)
        ? rawReadiness.categories
        : {},
  };

  // profileSnapshot — can be null on very old documents
  const profileSnapshot =
    value.profileSnapshot && typeof value.profileSnapshot === "object"
      ? value.profileSnapshot
      : {};

  // progress — always an object with numeric fields
  const rawProgress = value.progress && typeof value.progress === "object" ? value.progress : {};
  const progress = {
    totalTasks: rawProgress.totalTasks ?? 0,
    completedTasks: rawProgress.completedTasks ?? 0,
    skippedTasks: rawProgress.skippedTasks ?? 0,
    inProgressTasks: rawProgress.inProgressTasks ?? 0,
    percent: rawProgress.percent ?? 0,
    streak: rawProgress.streak ?? 0,
  };

  // timeline — always an object
  const rawTimeline = value.timeline && typeof value.timeline === "object" ? value.timeline : {};
  const timeline = {
    minWeeks: rawTimeline.minWeeks ?? 5,
    maxWeeks: rawTimeline.maxWeeks ?? 8,
    estimatedWeeks: rawTimeline.estimatedWeeks ?? 6,
    startDate: rawTimeline.startDate || value.createdAt || new Date(),
    disclaimer: rawTimeline.disclaimer ?? "",
    deadlineConstrained: rawTimeline.deadlineConstrained ?? false,
  };

  return {
    ...value, tasks, phases, gaps, readiness, profileSnapshot, progress, timeline,
    preparationGaps: Array.isArray(value.preparationGaps) ? value.preparationGaps : [],
    alreadyCovered: Array.isArray(value.alreadyCovered) ? value.alreadyCovered : [],
    confidenceActions: Array.isArray(value.confidenceActions) ? value.confidenceActions : [],
    nextBestMove: value.nextBestMove && typeof value.nextBestMove === "object" ? value.nextBestMove : null,
    biggestBlockers: Array.isArray(value.biggestBlockers) ? value.biggestBlockers : [],
    milestones: Array.isArray(value.milestones) ? value.milestones : [],
    strategyPhases: Array.isArray(value.strategyPhases) ? value.strategyPhases : [],
    currentPosition: value.currentPosition && typeof value.currentPosition === "object" ? value.currentPosition : { categories: [] },
  };
}

function serialize(plan, options = {}) {
  const raw = plan.toObject ? plan.toObject() : plan;
  const value = normalizePlanDocument(raw);
  const start = new Date(value.timeline.startDate || value.createdAt || Date.now());
  const estimatedWeeks = Number.isFinite(Number(value.timeline.estimatedWeeks)) && Number(value.timeline.estimatedWeeks) > 0 ? Number(value.timeline.estimatedWeeks) : 1;
  const currentWeek = Math.max(1, Math.min(estimatedWeeks, Math.floor((Date.now() - start.getTime()) / 604800000) + 1));
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

async function saveGenerated(userId, profile, alumni, target, existing, jobContexts = [], forceBenchmark = false) {
  const benchmark = await resolveTargetBenchmark({ target, selectedJobs: jobContexts.map((context) => context.job), alumni, force: forceBenchmark });
  const generated = buildPlan({ ...profile, userId }, alumni, target, existing, jobContexts, benchmark);
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
    return res.json({ plan: serialize(plan, { needsRecalculation: Number(plan.generationVersion || 0) < 4 || needsRecalculation(plan, profile, jobContexts) }) });
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
    const plan = await saveGenerated(req.auth.id, profile, alumni, target, existing, jobContexts, true);
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

exports.updateMilestone = async (req, res, next) => {
  try {
    const plan = await Plan.findOne({ userId: req.auth.id });
    if (!plan) return res.status(404).json({ message: "Plan not found." });
    const milestones = Array.isArray(plan.milestones) ? plan.milestones : [];
    const milestone = milestones.find((item) => item.id === req.params.milestoneId && !item.archived);
    if (!milestone) return res.status(404).json({ message: "Milestone not found in your active strategy." });
    const status = req.body.status;
    if (!["not_started", "in_progress", "completed", "skipped"].includes(status)) return res.status(400).json({ message: "Choose a valid milestone status." });
    milestone.status = status;
    milestone.completedAt = status === "completed" ? milestone.completedAt || new Date() : null;
    plan.markModified("milestones");
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
