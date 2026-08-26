const Job = require("../Models/Job");
const SavedJob = require("../Models/SavedJob");
const Profile = require("../Models/Profile");
const Plan = require("../Models/Plan");
const Alumni = require("../Models/Alumni");
const { findClosestSeniors } = require("../services/alumniMatchingService");
const { analyzeJobMatch } = require("../services/jobMatchingService");
const { verifyJob } = require("../services/jobVerificationService");
const { analyzeJobDescription, analyzeRawJobPost } = require("../services/jobJdAnalysisService");

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
    if (!validHttpUrl(input.officialUrl || input.applyUrl) || (input.sourceUrl && !validHttpUrl(input.sourceUrl))) return res.status(400).json({ message: "Use a valid http:// or https:// application and source URL." });
    const duplicate = await Job.findOne({ $or: [{ applyUrl: input.officialUrl || input.applyUrl }, { company: new RegExp(`^${String(input.company).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), title: new RegExp(`^${String(input.title).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }] }).lean();
    if (duplicate) return res.status(409).json({ message: "This job may already exist.", existingJobId: String(duplicate._id) });
    const extracted = await analyzeJobDescription({ title: input.title, company: input.company, description: input.description });
    const requirements = { ...extracted.analysis, ...(input.requirements || {}) };
    const job = new Job({ title: input.title, company: input.company, description: input.description, applyUrl: input.officialUrl || input.applyUrl, employmentType: input.employmentType || "full-time", experienceLevel: input.experienceLevel || extracted.analysis.experienceLevel, location: input.location || null, salary: input.salary || null, deadline: input.deadline || null, application: { officialUrl: input.officialUrl || input.applyUrl, deadline: input.deadline || null }, source: { type: input.sourceType || "admin", provider: input.sourceProvider || "manual", sourceUrl: input.sourceUrl || input.officialUrl || input.applyUrl, externalJobId: input.externalJobId || null, rawText: input.rawSourceText || null, contact: input.contact || null, postedText: input.postedText || null, applicantText: input.applicantText || null, hiringActivity: input.hiringActivity || null }, requirements, responsibilities: requirements.responsibilities, skills: input.skills || [...requirements.requiredSkills, ...requirements.preferredSkills], jdAnalysis: { ...extracted.analysis, source: extracted.source } });
    job.verification = verifyJob(job);
    job.active = job.verification.status !== "expired";
    await job.save();
    res.status(201).json({ job: serializeJob(job) });
  } catch (error) { next(error); }
};

exports.refreshAdminJob = async (req, res, next) => { try { const job = await Job.findById(req.params.id); if (!job) return res.status(404).json({ message: "Job not found." }); job.verification = verifyJob(job); job.active = job.verification.status !== "expired"; await job.save(); res.json({ job: serializeJob(job) }); } catch (error) { next(error); } };
exports.analyzeRawAdminJob = async (req, res, next) => { try { const rawText = String(req.body?.rawText || "").trim(); if (rawText.length < 20) return res.status(400).json({ message: "Paste a fuller job post so Newbert can extract useful details." }); if (rawText.length > 20000) return res.status(400).json({ message: "Raw job text is too long. Keep it below 20,000 characters." }); const extracted = await analyzeRawJobPost(rawText); const data = extracted.data; const officialUrl = data.officialApplyUrl || data.source?.sourceUrl || null; const verification = verifyJob({ applyUrl: officialUrl, application: { officialUrl }, source: { type: data.source?.detectedProvider || "unknown", sourceUrl: data.source?.sourceUrl } }); return res.json({ draft: { ...data, rawSourceText: rawText, verificationPreview: verification, extractionSource: extracted.source } }); } catch (error) { next(error); } };
exports.listAdminJobs = async (req, res, next) => { try { const jobs = await Job.find({}).sort({ createdAt: -1 }).lean(); const counts = { total: jobs.length, verified: 0, sourceConfirmed: 0, pending: 0, expired: 0, rejected: 0 }; jobs.forEach((job) => { const status = job.verification?.status || "pending"; if (status === "source_confirmed") counts.sourceConfirmed += 1; else if (Object.hasOwn(counts, status)) counts[status] += 1; else counts.pending += 1; }); res.json({ jobs: jobs.map(serializeJob), counts }); } catch (error) { next(error); } };
exports.updateAdminJob = async (req, res, next) => { try { const job = await Job.findById(req.params.id); if (!job) return res.status(404).json({ message: "Job not found." }); const input = req.body || {}; const url = input.officialUrl || input.applyUrl; if (url && !validHttpUrl(url)) return res.status(400).json({ message: "Use a valid http:// or https:// application URL." }); if (input.sourceUrl && !validHttpUrl(input.sourceUrl)) return res.status(400).json({ message: "Use a valid http:// or https:// source URL." }); ["title", "company", "description", "location", "salary", "deadline", "employmentType", "experienceLevel", "requirements", "skills"].forEach((key) => { if (input[key] !== undefined) job[key] = input[key]; }); if (url) { job.applyUrl = url; job.application = { ...(job.application || {}), officialUrl: url }; } if (input.sourceUrl || input.sourceType || input.sourceProvider) job.source = { ...(job.source || {}), ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}), ...(input.sourceType ? { type: input.sourceType } : {}), ...(input.sourceProvider ? { provider: input.sourceProvider } : {}) }; await job.save(); res.json({ job: serializeJob(job) }); } catch (error) { next(error); } };
exports.updateAdminJobStatus = async (req, res, next) => { try { const job = await Job.findById(req.params.id); const allowed = ["verified", "source_confirmed", "pending", "rejected", "expired"]; if (!job) return res.status(404).json({ message: "Job not found." }); if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Choose a valid verification status." }); job.verification = { ...(job.verification || {}), status: req.body.status, checkedBy: String(req.auth.id), method: "manual", lastCheckedAt: new Date(), ...(req.body.status === "verified" ? { verifiedAt: new Date() } : {}) }; job.active = req.body.status !== "expired" && req.body.status !== "rejected"; await job.save(); res.json({ job: serializeJob(job) }); } catch (error) { next(error); } };
exports.deleteAdminJob = async (req, res, next) => { try { const job = await Job.findByIdAndDelete(req.params.id); if (!job) return res.status(404).json({ message: "Job not found." }); await SavedJob.deleteMany({ jobId: job._id }); res.status(204).end(); } catch (error) { next(error); } };
