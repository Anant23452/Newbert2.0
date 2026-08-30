const Job = require("../Models/Job");
const SavedJob = require("../Models/SavedJob");
const Profile = require("../Models/Profile");
const Plan = require("../Models/Plan");
const Alumni = require("../Models/Alumni");
const { findClosestSeniors } = require("../services/alumniMatchingService");
const { analyzeJobMatch } = require("../services/jobMatchingService");
const { explainJobMatch } = require("../services/jobMatchExplanationService");
const { verifyJob } = require("../services/jobVerificationService");
const { analyzeJobDescription, analyzeRawJobPost, compatibilityFields, mergeAdminRequirements } = require("../services/jobJdAnalysisService");
const { normalizeStudentProfile } = require("../services/studentProfileNormalizationService");

async function studentContext(userId) {
  const [profile, plan] = await Promise.all([Profile.findOne({ userId }).lean(), Plan.findOne({ userId }).lean()]);
  if (!profile) { const error = new Error("Complete your profile before using personalized job matching."); error.status = 400; throw error; }
  return { profile, normalizedProfile: normalizeStudentProfile(profile), plan };
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
function cleanText(value, maxLength = 5000) { return typeof value === "string" ? value.trim().slice(0, maxLength) : ""; }
function cleanList(value, maxLength = 40) { return Array.isArray(value) ? [...new Set(value.map((item) => cleanText(String(item), 100)).filter(Boolean))].slice(0, maxLength) : []; }
function cleanDate(value) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date; }
function cleanNumber(value) { if (value == null || value === "") return null; const number = Number(value); return Number.isFinite(number) ? number : null; }
function cleanLocation(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string") return cleanText(value, 200) || null;
  if (typeof value !== "object" || Array.isArray(value)) return null;
  return {
    city: cleanText(value.city, 100) || null,
    state: cleanText(value.state, 100) || null,
    country: cleanText(value.country, 100) || null,
    raw: cleanText(value.raw, 200) || null,
    remoteType: cleanText(value.remoteType, 40) || null,
  };
}
function cleanSalary(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const min = Number(value.min); const max = Number(value.max);
  return {
    min: Number.isFinite(min) && min >= 0 ? min : null,
    max: Number.isFinite(max) && max >= 0 ? max : null,
    currency: cleanText(value.currency, 10) || "INR",
    period: cleanText(value.period, 20) || "year",
  };
}
function cleanRequirements(input, extracted) {
  const supplied = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const analysis = extracted && typeof extracted === "object" ? extracted : {};
  const requiredSkills = Array.isArray(supplied.requiredSkills) ? cleanList(supplied.requiredSkills) : cleanList(analysis.requiredSkills);
  const preferredSkills = Array.isArray(supplied.preferredSkills) ? cleanList(supplied.preferredSkills) : cleanList(analysis.preferredSkills);
  const csFundamentals = Array.isArray(supplied.csFundamentals) ? cleanList(supplied.csFundamentals) : cleanList(analysis.csFundamentals);
  return { requiredSkills, preferredSkills, csFundamentals, allowedBranches: cleanList(supplied.allowedBranches ?? analysis.allowedBranches), graduationYears: cleanList(supplied.graduationYears ?? analysis.graduationYears).map(Number).filter(Number.isFinite), responsibilities: cleanList(supplied.responsibilities ?? analysis.responsibilities), minimumCgpa: cleanNumber(supplied.minimumCgpa ?? analysis.minimumCgpa), experienceYears: cleanNumber(supplied.experienceYears ?? analysis.experienceYears), minimumProjects: cleanNumber(supplied.minimumProjects ?? analysis.minimumProjects) };
}
async function expireDueJobs() {
  const now = new Date();
  await Job.updateMany({ active: true, $or: [{ expiresAt: { $lt: now } }, { "application.deadline": { $lt: now } }, { deadline: { $lt: now } }] }, { $set: { active: false, "verification.status": "expired", "verification.lastCheckedAt": now } });
}

exports.listJobs = async (req, res, next) => {
  try {
    await expireDueJobs();
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
    await expireDueJobs();
    const { profile, plan } = await studentContext(req.auth.id);
    const jobs = await Job.find(activeQuery(req.query)).lean();
    const saved = await SavedJob.find({ userId: req.auth.id }).lean();
    const savedByJob = new Map(saved.map((item) => [String(item.jobId), item]));
    const normalizedProfile = normalizeStudentProfile(profile);
    const results = jobs.map((job) => ({ job: serializeJob(job), match: analyzeJobMatch(normalizedProfile, job), saved: savedByJob.get(String(job._id)) || null })).sort((a, b) => (b.match.coverage.overall.value ?? -1) - (a.match.coverage.overall.value ?? -1));
    res.json({ context: { goal: plan?.target?.type || profile.targetRole || null, skills: (profile.skills || []).map((skill) => skill.name || skill), projects: profile.projects ?? null, dsaSolved: profile.leetcodeStats?.totalSolved ?? null }, jobs: results });
  } catch (error) { next(error); }
};

exports.jobAnalysis = async (req, res, next) => {
  try {
    const [context, job] = await Promise.all([studentContext(req.auth.id), Job.findOne({ _id: req.params.id, active: true }).lean()]);
    if (!job) return res.status(404).json({ message: "Job not found." });
    const match = analyzeJobMatch(context.normalizedProfile, job);
    const explanation = await explainJobMatch(match);
    const allAlumni = await Alumni.find({ verified: true, outcomeType: { $in: ["placement", "data", "internship"] } }).lean();
    const exactCompany = allAlumni.filter((alumni) => (alumni.placement?.company || alumni.company || "").toLowerCase() === job.company.toLowerCase());
    const relevantAlumni = findClosestSeniors(context.profile, exactCompany.length ? exactCompany : allAlumni, 3, { goal: "placement", target: { role: job.title } });
    res.json({ job: serializeJob(job), match, explanation, relevantAlumni, planGaps: { critical: match.gaps.critical, recommended: match.gaps.recommended, optional: match.gaps.optional, unknown: match.gaps.unknown } });
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
    const title = cleanText(input.title, 140); const company = cleanText(input.company, 120); const description = cleanText(input.description, 5000); const applicationUrl = cleanText(input.officialUrl || input.applyUrl, 2000);
    if (!title || !company || !description || !applicationUrl) return res.status(400).json({ message: "Title, company, job description, and official application URL are required." });
    if (!validHttpUrl(applicationUrl) || (input.sourceUrl && !validHttpUrl(input.sourceUrl))) return res.status(400).json({ message: "Use a valid http:// or https:// application and source URL." });
    if (input.deadline && !cleanDate(input.deadline)) return res.status(400).json({ message: "Use a valid application deadline." });
    if (input.location != null && !cleanLocation(input.location)) return res.status(400).json({ message: "Location must be text or a location object." });
    if (input.salary != null && !cleanSalary(input.salary)) return res.status(400).json({ message: "Salary must be an object with optional min and max values." });
    const duplicate = await Job.findOne({ $or: [{ applyUrl: applicationUrl }, { company: new RegExp(`^${company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), title: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }] }).lean();
    if (duplicate) return res.status(409).json({ message: "This job may already exist.", existingJobId: String(duplicate._id) });
    const extracted = await analyzeJobDescription({ title, company, description });
    const requirements = cleanRequirements(input.requirements, extracted.analysis);
    const jdAnalysis = mergeAdminRequirements(extracted.analysis, input.requirements, { title, company, description });
    Object.assign(requirements, compatibilityFields(jdAnalysis));
    const skills = cleanList(input.skills).length ? cleanList(input.skills) : cleanList([...requirements.requiredSkills, ...requirements.preferredSkills]);
    const deadline = cleanDate(input.deadline);
    const sourceInput = input.source && typeof input.source === "object" && !Array.isArray(input.source) ? input.source : {};
    const job = new Job({ title, company, description, applyUrl: applicationUrl, employmentType: ["internship", "full-time", "part-time", "contract"].includes(input.employmentType) ? input.employmentType : "full-time", experienceLevel: ["intern", "entry-level", "junior", "mid", "senior", "unspecified"].includes(input.experienceLevel) ? input.experienceLevel : extracted.analysis.experienceLevel, location: cleanLocation(input.location), salary: cleanSalary(input.salary), deadline, application: { officialUrl: applicationUrl, deadline }, source: { type: cleanText(input.sourceType || sourceInput.type, 50) || "admin", provider: cleanText(input.sourceProvider || sourceInput.provider, 80) || "manual", sourceUrl: cleanText(input.sourceUrl || sourceInput.sourceUrl, 2000) || applicationUrl, externalJobId: cleanText(input.externalJobId || sourceInput.externalJobId, 200) || null, rawText: cleanText(input.rawSourceText || sourceInput.rawText, 20000) || null, contact: input.contact && typeof input.contact === "object" && !Array.isArray(input.contact) ? input.contact : null, postedText: cleanText(input.postedText || sourceInput.postedText, 200) || null, applicantText: cleanText(input.applicantText || sourceInput.applicantText, 200) || null, hiringActivity: cleanText(input.hiringActivity || sourceInput.hiringActivity, 200) || null }, requirements, responsibilities: requirements.responsibilities, skills, jdAnalysis });
    job.verification = verifyJob(job);
    job.active = job.verification.status !== "expired";
    await job.save();
    res.status(201).json({ job: serializeJob(job) });
  } catch (error) {
    console.error("Admin job create failed", { route: "POST /api/admin/jobs", message: error.message, stack: error.stack });
    if (error.name === "ValidationError") return res.status(400).json({ message: `Invalid job data: ${Object.values(error.errors).map((item) => item.message).join(" ")}` });
    return res.status(500).json({ message: "Unable to publish this job. Check the entered job details and try again." });
  }
};

exports.refreshAdminJob = async (req, res, next) => { try { const job = await Job.findById(req.params.id); if (!job) return res.status(404).json({ message: "Job not found." }); const extracted = await analyzeJobDescription({ title: job.title, company: job.company, description: job.description }); const preserveManual = job.jdAnalysis?.metadata?.extractionMethod === "admin_override"; job.jdAnalysis = mergeAdminRequirements(extracted.analysis, preserveManual ? job.requirements : null, { title: job.title, company: job.company, description: job.description }); job.requirements = { ...(job.requirements || {}), ...compatibilityFields(job.jdAnalysis) }; job.skills = [...new Set([...(job.requirements.requiredSkills || []), ...(job.requirements.preferredSkills || [])])]; job.verification = verifyJob(job); job.active = job.verification.status !== "expired"; await job.save(); res.json({ job: serializeJob(job) }); } catch (error) { next(error); } };
exports.analyzeRawAdminJob = async (req, res, next) => { try { const rawText = String(req.body?.rawText || "").trim(); if (rawText.length < 20) return res.status(400).json({ message: "Paste a fuller job post so Newbert can extract useful details." }); if (rawText.length > 20000) return res.status(400).json({ message: "Raw job text is too long. Keep it below 20,000 characters." }); const extracted = await analyzeRawJobPost(rawText); const data = extracted.data; const officialUrl = data.officialApplyUrl || data.source?.sourceUrl || null; const verification = verifyJob({ applyUrl: officialUrl, application: { officialUrl }, source: { type: data.source?.detectedProvider || "unknown", sourceUrl: data.source?.sourceUrl } }); return res.json({ draft: { ...data, rawSourceText: rawText, verificationPreview: verification, extractionSource: extracted.source } }); } catch (error) { next(error); } };
exports.listAdminJobs = async (req, res, next) => { try { const jobs = await Job.find({}).sort({ createdAt: -1 }).lean(); const counts = { total: jobs.length, verified: 0, sourceConfirmed: 0, pending: 0, expired: 0, rejected: 0 }; jobs.forEach((job) => { const status = job.verification?.status || "pending"; if (status === "source_confirmed") counts.sourceConfirmed += 1; else if (Object.hasOwn(counts, status)) counts[status] += 1; else counts.pending += 1; }); res.json({ jobs: jobs.map(serializeJob), counts }); } catch (error) { next(error); } };
exports.updateAdminJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found." });
    const input = req.body || {};
    const url = input.officialUrl || input.applyUrl;
    if (url && !validHttpUrl(url)) return res.status(400).json({ message: "Use a valid http:// or https:// application URL." });
    if (input.sourceUrl && !validHttpUrl(input.sourceUrl)) return res.status(400).json({ message: "Use a valid http:// or https:// source URL." });
    const nextTitle = input.title !== undefined ? cleanText(input.title, 140) : job.title;
    const nextCompany = input.company !== undefined ? cleanText(input.company, 120) : job.company;
    const nextDescription = input.description !== undefined ? cleanText(input.description, 5000) : job.description;
    if (!nextTitle || !nextCompany || !nextDescription) return res.status(400).json({ message: "Title, company, and job description cannot be empty." });
    const jdChanged = nextTitle !== job.title || nextDescription !== job.description;
    job.title = nextTitle; job.company = nextCompany; job.description = nextDescription;
    if (input.location !== undefined) job.location = cleanLocation(input.location);
    if (input.salary !== undefined) job.salary = cleanSalary(input.salary);
    if (input.deadline !== undefined) { job.deadline = cleanDate(input.deadline); job.application = { ...(job.application || {}), deadline: job.deadline }; }
    if (["internship", "full-time", "part-time", "contract"].includes(input.employmentType)) job.employmentType = input.employmentType;
    if (["intern", "entry-level", "junior", "mid", "senior", "unspecified"].includes(input.experienceLevel)) job.experienceLevel = input.experienceLevel;
    if (url) { job.applyUrl = url; job.application = { ...(job.application || {}), officialUrl: url }; }
    if (input.sourceUrl || input.sourceType || input.sourceProvider) job.source = { ...(job.source || {}), ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}), ...(input.sourceType ? { type: input.sourceType } : {}), ...(input.sourceProvider ? { provider: input.sourceProvider } : {}) };
    if (jdChanged || input.requirements !== undefined) {
      const extracted = await analyzeJobDescription({ title: job.title, company: job.company, description: job.description });
      const supplied = input.requirements !== undefined ? cleanRequirements(input.requirements, {}) : job.jdAnalysis?.metadata?.extractionMethod === "admin_override" ? job.requirements : null;
      job.jdAnalysis = mergeAdminRequirements(extracted.analysis, supplied, { title: job.title, company: job.company, description: job.description });
      job.requirements = { ...(job.requirements || {}), ...compatibilityFields(job.jdAnalysis) };
      job.responsibilities = job.requirements.responsibilities || [];
      job.skills = [...new Set([...(job.requirements.requiredSkills || []), ...(job.requirements.preferredSkills || [])])];
    }
    job.verification = verifyJob(job);
    job.active = !["expired", "rejected"].includes(job.verification.status);
    await job.save();
    return res.json({ job: serializeJob(job) });
  } catch (error) { return next(error); }
};
exports.updateAdminJobStatus = async (req, res, next) => { try { const job = await Job.findById(req.params.id); const allowed = ["verified", "source_confirmed", "pending", "rejected", "expired"]; if (!job) return res.status(404).json({ message: "Job not found." }); if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Choose a valid verification status." }); job.verification = { ...(job.verification || {}), status: req.body.status, checkedBy: String(req.auth.id), method: "manual", lastCheckedAt: new Date(), ...(req.body.status === "verified" ? { verifiedAt: new Date() } : {}) }; job.active = req.body.status !== "expired" && req.body.status !== "rejected"; await job.save(); res.json({ job: serializeJob(job) }); } catch (error) { next(error); } };
exports.deleteAdminJob = async (req, res, next) => { try { const job = await Job.findByIdAndDelete(req.params.id); if (!job) return res.status(404).json({ message: "Job not found." }); await SavedJob.deleteMany({ jobId: job._id }); res.status(204).end(); } catch (error) { next(error); } };
