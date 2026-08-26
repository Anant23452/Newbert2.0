const Job = require("../Models/Job");
const SavedJob = require("../models/SavedJob");
const Profile = require("../Models/Profile");
const Plan = require("../Models/Plan");
const Alumni = require("../Models/Alumni");
const { findClosestSeniors } = require("../services/alumniMatchingService");
const { analyzeJobMatch } = require("../services/jobMatchingService");
const { verifyJob } = require("../services/jobVerificationService");
const { analyzeJobDescription } = require("../services/jobJdAnalysisService");

async function studentContext(userId) {
  const [profile, plan] = await Promise.all([Profile.findOne({ userId }).lean(), Plan.findOne({ userId }).lean()]);
  if (!profile) { const error = new Error("Complete your profile before using personalized job matching."); error.status = 400; throw error; }
  return { profile, plan };
}
function activeQuery(query = {}) {
  const filters = { active: true, $or: [{ "verification.status": "verified" }, { "verification.status": "source_confirmed" }, { verification: null }] };
  if (query.search?.trim()) filters.$and = [{ $or: ["title", "company", "skills"].map((field) => ({ [field]: { $regex: query.search.trim(), $options: "i" } })) }];
  if (query.employmentType) filters.employmentType = query.employmentType;
  if (query.company) filters.company = { $regex: query.company, $options: "i" };
  if (query.role) filters.roleCategory = { $regex: query.role, $options: "i" };
  return filters;
}
function serializeJob(job) { const value = job.toObject ? job.toObject() : job; return { ...value, application: value.application || { officialUrl: value.applyUrl, deadline: value.deadline || null }, verification: value.verification || { status: "pending", sourceType: "unknown", lastCheckedAt: null } }; }
function validHttpUrl(value) { try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } }

exports.listJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find(activeQuery(req.query)).sort({ postedAt: -1, createdAt: -1 }).lean();
    res.json({ jobs: jobs.map(serializeJob) });
  } catch (error) { next(error); }
};

exports.getJob = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, active: true }).lean();
    if (!job) return res.status(404).json({ message: "Job not found." });
    res.json({ job: serializeJob(job) });
  } catch (error) { next(error); }
};

exports.recommendedJobs = async (req, res, next) => {
  try {
    const { profile, plan } = await studentContext(req.auth.id);
    const jobs = await Job.find(activeQuery(req.query)).lean();
    const saved = await SavedJob.find({ userId: req.auth.id }).lean();
    const savedByJob = new Map(saved.map((item) => [String(item.jobId), item]));
    const results = jobs.map((job) => ({ job: serializeJob(job), match: analyzeJobMatch(profile, job), saved: savedByJob.get(String(job._id)) || null })).sort((a, b) => (b.match.eligible ? 1 : 0) - (a.match.eligible ? 1 : 0) || (b.match.overallScore ?? -1) - (a.match.overallScore ?? -1));
    res.json({ context: { goal: plan?.target?.type || profile.targetRole || null, skills: (profile.skills || []).map((skill) => skill.name || skill), projects: profile.projects ?? null, dsaSolved: profile.leetcodeStats?.totalSolved ?? null }, jobs: results });
  } catch (error) { next(error); }
};

exports.jobAnalysis = async (req, res, next) => {
  try {
    const [context, job] = await Promise.all([studentContext(req.auth.id), Job.findOne({ _id: req.params.id, active: true }).lean()]);
    if (!job) return res.status(404).json({ message: "Job not found." });
    const match = analyzeJobMatch(context.profile, job);
    const allAlumni = await Alumni.find({ verified: true, outcomeType: { $in: ["placement", "data", "internship"] } }).lean();
    const exactCompany = allAlumni.filter((alumni) => (alumni.placement?.company || alumni.company || "").toLowerCase() === job.company.toLowerCase());
    const relevantAlumni = findClosestSeniors(context.profile, exactCompany.length ? exactCompany : allAlumni, 3, { goal: "placement", target: { role: job.title } });
    res.json({ job: serializeJob(job), match, relevantAlumni, planGaps: { critical: match.gaps.critical, recommended: match.gaps.recommended, optional: match.gaps.optional } });
  } catch (error) { next(error); }
};

exports.saveJob = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, active: true });
    if (!job) return res.status(404).json({ message: "Job not found." });
    const saved = await SavedJob.findOneAndUpdate({ userId: req.auth.id, jobId: job._id }, { $setOnInsert: { status: "saved" } }, { new: true, upsert: true, setDefaultsOnInsert: true });
    res.status(201).json({ saved });
  } catch (error) { next(error); }
};

exports.unsaveJob = async (req, res, next) => { try { await SavedJob.deleteOne({ userId: req.auth.id, jobId: req.params.id }); res.status(204).end(); } catch (error) { next(error); } };
exports.updateSavedJob = async (req, res, next) => { try { const saved = await SavedJob.findOneAndUpdate({ userId: req.auth.id, jobId: req.params.id }, { $set: { status: req.body.status } }, { new: true, runValidators: true }); if (!saved) return res.status(404).json({ message: "Save this job before tracking it." }); res.json({ saved }); } catch (error) { next(error); } };

exports.createAdminJob = async (req, res, next) => {
  try {
    const input = req.body || {};
    if (!input.title || !input.company || !input.description || !(input.officialUrl || input.applyUrl)) return res.status(400).json({ message: "Title, company, job description, and official application URL are required." });
    const extracted = await analyzeJobDescription({ title: input.title, company: input.company, description: input.description });
    const requirements = { ...extracted.analysis, ...(input.requirements || {}) };
    const job = new Job({ title: input.title, company: input.company, description: input.description, applyUrl: input.officialUrl || input.applyUrl, employmentType: input.employmentType || "full-time", experienceLevel: input.experienceLevel || extracted.analysis.experienceLevel, location: input.location || null, deadline: input.deadline || null, application: { officialUrl: input.officialUrl || input.applyUrl, deadline: input.deadline || null }, source: { type: "admin", provider: input.sourceProvider || "manual", sourceUrl: input.officialUrl || input.applyUrl }, requirements, responsibilities: requirements.responsibilities, skills: input.skills || [...requirements.requiredSkills, ...requirements.preferredSkills], jdAnalysis: { ...extracted.analysis, source: extracted.source } });
    job.verification = verifyJob(job);
    job.active = job.verification.status !== "expired";
    await job.save();
    res.status(201).json({ job: serializeJob(job) });
  } catch (error) { next(error); }
};

exports.refreshAdminJob = async (req, res, next) => { try { const job = await Job.findById(req.params.id); if (!job) return res.status(404).json({ message: "Job not found." }); job.verification = verifyJob(job); job.active = job.verification.status !== "expired"; await job.save(); res.json({ job: serializeJob(job) }); } catch (error) { next(error); } };
