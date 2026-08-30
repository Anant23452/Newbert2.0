const Job = require("../Models/Job");
const SavedJob = require("../Models/SavedJob");
const Profile = require("../Models/Profile");
const Plan = require("../Models/Plan");
const Alumni = require("../Models/Alumni");
const { findClosestSeniors } = require("../services/alumniMatchingService");
const { analyzeJobMatch } = require("../services/jobMatchingService");
const { explainJobMatch } = require("../services/jobMatchExplanationService");
const { verifyJob } = require("../services/jobVerificationService");
const { analyzeJobDescription, analyzeRawJobPost, compatibilityFields, mergeAdminRequirements, normalizeStructuredAnalysis } = require("../services/jobJdAnalysisService");
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
    period: cleanText(value.period, 20) || "yearly",
  };
}
function cleanCompensation(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const allowedTypes = ["salary", "stipend", "unknown"]; const allowedPeriods = ["hourly", "monthly", "yearly", "total", "unknown"];
  let minAmount = cleanNumber(value.minAmount); let maxAmount = cleanNumber(value.maxAmount);
  minAmount = minAmount != null && minAmount >= 0 ? minAmount : null; maxAmount = maxAmount != null && maxAmount >= 0 ? maxAmount : null;
  if (minAmount != null && maxAmount != null && maxAmount < minAmount) [minAmount, maxAmount] = [maxAmount, minAmount];
  return { type: allowedTypes.includes(value.type) ? value.type : "unknown", currency: cleanText(value.currency, 10).toUpperCase() || null, minAmount, maxAmount, period: allowedPeriods.includes(value.period) ? value.period : "unknown", ppoAvailable: typeof value.ppoAvailable === "boolean" ? value.ppoAvailable : null, bonus: cleanText(value.bonus, 300) || null, equity: cleanText(value.equity, 300) || null };
}
function cleanExperience(value) { if (!value || typeof value !== "object" || Array.isArray(value)) return null; let minYears = cleanNumber(value.minYears); let maxYears = cleanNumber(value.maxYears); minYears = minYears != null && minYears >= 0 && minYears <= 80 ? minYears : null; maxYears = maxYears != null && maxYears >= 0 && maxYears <= 80 ? maxYears : null; if (minYears != null && maxYears != null && maxYears < minYears) [minYears, maxYears] = [maxYears, minYears]; return { minYears, maxYears }; }
function cleanDuration(value) { if (!value || typeof value !== "object" || Array.isArray(value)) return null; const amount = cleanNumber(value.value); const unit = ["days", "weeks", "months", "years"].includes(value.unit) ? value.unit : null; return amount > 0 && amount <= 120 && unit ? { value: amount, unit } : null; }
function cleanManualOverrides(value) { if (!value || typeof value !== "object" || Array.isArray(value)) return {}; const allowed = new Set(["title", "company", "department", "roleCategory", "locationCity", "locationState", "locationCountry", "multipleLocations", "workMode", "employmentType", "experienceLevel", "experienceMin", "experienceMax", "compensationType", "currency", "salaryMin", "salaryMax", "compensationPeriod", "ppoAvailable", "bonus", "equity", "postedDate", "deadline", "joiningDate", "durationValue", "durationUnit", "degrees", "allowedBranches", "graduationYears", "minimumCgpa", "maximumCgpa", "backlogPolicy", "workAuthorization", "locationRestrictions", "otherEligibility", "criticalSkills", "requiredSkills", "preferredSkills", "optionalSkills", "csFundamentals", "responsibilities", "qualifications", "projectExpectations", "selectionProcess", "benefits", "companyDescription", "applicationInstructions", "officialUrl", "sourceUrl"]); return Object.fromEntries(Object.entries(value).filter(([key]) => allowed.has(key)).map(([key, item]) => [key, Array.isArray(item) ? cleanList(item) : typeof item === "boolean" ? item : cleanText(String(item ?? ""), 3000)])); }
function cleanRequirements(input, extracted) {
  const supplied = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const analysis = extracted && typeof extracted === "object" ? extracted : {};
  const requiredSkills = Array.isArray(supplied.requiredSkills) ? cleanList(supplied.requiredSkills) : cleanList(analysis.requiredSkills);
  const preferredSkills = Array.isArray(supplied.preferredSkills) ? cleanList(supplied.preferredSkills) : cleanList(analysis.preferredSkills);
  const csFundamentals = Array.isArray(supplied.csFundamentals) ? cleanList(supplied.csFundamentals) : cleanList(analysis.csFundamentals);
  return { criticalSkills: cleanList(supplied.criticalSkills ?? analysis.criticalSkills), requiredSkills, preferredSkills, optionalSkills: cleanList(supplied.optionalSkills ?? analysis.optionalSkills), csFundamentals, degrees: cleanList(supplied.degrees ?? analysis.degrees), allowedBranches: cleanList(supplied.allowedBranches ?? analysis.allowedBranches), graduationYears: cleanList(supplied.graduationYears ?? analysis.graduationYears).map(Number).filter((year) => Number.isInteger(year) && year >= 2000 && year <= 2100), responsibilities: cleanList(supplied.responsibilities ?? analysis.responsibilities), qualifications: cleanList(supplied.qualifications ?? analysis.qualifications), projectExpectations: cleanList(supplied.projectExpectations ?? analysis.projectExpectations), selectionProcess: cleanList(supplied.selectionProcess ?? analysis.selectionProcess), benefits: cleanList(supplied.benefits ?? analysis.benefits), locationRestrictions: cleanList(supplied.locationRestrictions ?? analysis.locationRestrictions), otherEligibility: cleanList(supplied.otherEligibility ?? analysis.otherEligibility), minimumCgpa: (() => { const value = cleanNumber(supplied.minimumCgpa ?? analysis.minimumCgpa); return value != null && value >= 0 && value <= 10 ? value : null; })(), maximumCgpa: (() => { const value = cleanNumber(supplied.maximumCgpa ?? analysis.maximumCgpa); return value != null && value >= 0 && value <= 10 ? value : null; })(), backlogPolicy: cleanText(supplied.backlogPolicy ?? analysis.backlogPolicy, 500) || null, workAuthorization: cleanText(supplied.workAuthorization ?? analysis.workAuthorization, 500) || null, experienceYears: cleanNumber(supplied.experienceYears ?? analysis.experienceYears), minimumProjects: cleanNumber(supplied.minimumProjects ?? analysis.minimumProjects) };
}
function reviewedAnalysis(baseAnalysis, input, requirements, context) {
  const analysis = mergeAdminRequirements(baseAnalysis, requirements, context);
  const compensation = cleanCompensation(input.compensation) || analysis.compensation;
  const experience = cleanExperience(input.experience) || analysis.basic?.experience || { minYears: null, maxYears: null };
  analysis.basic = {
    ...analysis.basic,
    companyName: context.company,
    jobTitle: context.title,
    department: cleanText(input.department, 120) || null,
    roleCategory: cleanText(input.roleCategory, 80) || null,
    employmentType: ["full-time", "part-time", "internship", "contract", "apprenticeship", "temporary", "unknown"].includes(input.employmentType) ? input.employmentType : "unknown",
    workMode: ["onsite", "hybrid", "remote", "unknown"].includes(input.workMode) ? input.workMode : "unknown",
    location: cleanLocation(input.location) || { city: null, state: null, country: null, raw: null },
    multipleLocations: Array.isArray(input.multipleLocations) ? input.multipleLocations.map(cleanLocation).filter(Boolean).slice(0, 20) : [],
    experienceLevel: ["intern", "entry-level", "junior", "mid", "senior", "unspecified"].includes(input.experienceLevel) ? input.experienceLevel : "unspecified",
    experience,
  };
  analysis.role = context.title; analysis.experience = experience; analysis.compensation = compensation;
  analysis.dates = { ...analysis.dates, postedDate: input.postedDate || null, applicationDeadline: input.deadline || null, joiningDate: input.joiningDate || null, internshipDuration: cleanDuration(input.internshipDuration) || { value: null, unit: null } };
  analysis.responsibilities = requirements.responsibilities; analysis.qualifications = requirements.qualifications; analysis.projectExpectations = requirements.projectExpectations; analysis.selectionProcess = requirements.selectionProcess; analysis.benefits = requirements.benefits;
  analysis.companyDescription = cleanText(input.companyDescription, 3000) || null; analysis.applicationInstructions = cleanText(input.applicationInstructions, 3000) || null;
  analysis.application = { officialApplyUrl: cleanText(input.officialUrl || input.applyUrl, 2000) || null, sourceUrl: cleanText(input.sourceUrl, 2000) || null };
  analysis.adminOverrides = cleanManualOverrides(input.manualOverrides);
  analysis.metadata = { ...baseAnalysis.metadata, ...analysis.metadata, extractionMethod: input.structuredAnalysis ? "admin_reviewed" : analysis.metadata?.extractionMethod || "deterministic", reviewedAt: new Date().toISOString() };
  Object.assign(analysis, compatibilityFields(analysis));
  return analysis;
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
    const analysisDescription = cleanText(input.rawSourceText, 20000) || description;
    const reviewedDraft = input.structuredAnalysis && typeof input.structuredAnalysis === "object" && !Array.isArray(input.structuredAnalysis) ? normalizeStructuredAnalysis(input.structuredAnalysis, { title, company, description: analysisDescription }, "reviewed_ai_draft") : null;
    const extracted = reviewedDraft ? { analysis: reviewedDraft, source: input.structuredAnalysis?.metadata?.extractionMethod === "gemini" ? "gemini" : "deterministic" } : await analyzeJobDescription({ title, company, description: analysisDescription });
    const requirements = cleanRequirements(input.requirements, extracted.analysis);
    const jdAnalysis = reviewedAnalysis(extracted.analysis, input, requirements, { title, company, description: analysisDescription });
    Object.assign(requirements, compatibilityFields(jdAnalysis), { maximumCgpa: jdAnalysis.eligibility.maximumCgpa, degrees: jdAnalysis.eligibility.degrees, backlogPolicy: jdAnalysis.eligibility.backlogPolicy, workAuthorization: jdAnalysis.eligibility.workAuthorization, locationRestrictions: jdAnalysis.eligibility.locationRestrictions, otherEligibility: jdAnalysis.eligibility.otherEligibility });
    const skills = cleanList(input.skills).length ? cleanList(input.skills) : cleanList([...requirements.requiredSkills, ...requirements.preferredSkills]);
    const deadline = cleanDate(input.deadline); const postedAt = cleanDate(input.postedDate); const joiningDate = cleanDate(input.joiningDate);
    const sourceInput = input.source && typeof input.source === "object" && !Array.isArray(input.source) ? input.source : {};
    const compensation = cleanCompensation(input.compensation); const salary = compensation && (compensation.minAmount != null || compensation.maxAmount != null) ? { min: compensation.minAmount, max: compensation.maxAmount, currency: compensation.currency, period: compensation.period } : cleanSalary(input.salary);
    const job = new Job({ title, company, department: cleanText(input.department, 120) || null, roleCategory: cleanText(input.roleCategory, 80) || null, description, applyUrl: applicationUrl, employmentType: ["full-time", "part-time", "internship", "contract", "apprenticeship", "temporary", "unknown"].includes(input.employmentType) ? input.employmentType : "unknown", workMode: ["onsite", "hybrid", "remote", "unknown"].includes(input.workMode) ? input.workMode : "unknown", experienceLevel: ["intern", "entry-level", "junior", "mid", "senior", "unspecified"].includes(input.experienceLevel) ? input.experienceLevel : "unspecified", experience: cleanExperience(input.experience), location: cleanLocation(input.location), multipleLocations: Array.isArray(input.multipleLocations) ? input.multipleLocations.map(cleanLocation).filter(Boolean).slice(0, 20) : [], salary, compensation, deadline, postedAt, joiningDate, internshipDuration: cleanDuration(input.internshipDuration), application: { officialUrl: applicationUrl, deadline, instructions: cleanText(input.applicationInstructions, 3000) || null }, source: { type: cleanText(input.sourceType || sourceInput.type, 50) || "admin", provider: cleanText(input.sourceProvider || sourceInput.provider, 80) || "manual", sourceUrl: cleanText(input.sourceUrl || sourceInput.sourceUrl, 2000) || applicationUrl, externalJobId: cleanText(input.externalJobId || sourceInput.externalJobId, 200) || null, rawText: cleanText(input.rawSourceText || sourceInput.rawText, 20000) || description, contact: input.contact && typeof input.contact === "object" && !Array.isArray(input.contact) ? input.contact : null, postedText: cleanText(input.postedText || sourceInput.postedText, 200) || null, applicantText: cleanText(input.applicantText || sourceInput.applicantText, 200) || null, hiringActivity: cleanText(input.hiringActivity || sourceInput.hiringActivity, 200) || null }, requirements, responsibilities: requirements.responsibilities, qualifications: requirements.qualifications, projectExpectations: requirements.projectExpectations, selectionProcess: requirements.selectionProcess, benefits: requirements.benefits, companyDescription: cleanText(input.companyDescription, 3000) || null, applicationInstructions: cleanText(input.applicationInstructions, 3000) || null, skills, jdAnalysis });
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

exports.refreshAdminJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found." });

    // Refresh only AI analysis. Admin-reviewed verification is an independent decision.
    const previousVerification = job.verification?.toObject ? job.verification.toObject() : { ...(job.verification || {}) };
    const rawText = cleanText(job.source?.rawText, 20000) || job.description;
    const extracted = await analyzeJobDescription({ title: job.title, company: job.company, description: rawText });
    const reviewedRequirements = cleanRequirements(job.requirements, extracted.analysis);
    const refreshed = mergeAdminRequirements(extracted.analysis, reviewedRequirements, { title: job.title, company: job.company, description: rawText });
    refreshed.adminOverrides = { ...(job.jdAnalysis?.adminOverrides || {}) };
    refreshed.metadata = {
      ...refreshed.metadata,
      extractionMethod: job.jdAnalysis?.metadata?.extractionMethod === "admin_reviewed" ? "admin_reviewed" : refreshed.metadata?.extractionMethod,
      refreshedAt: new Date().toISOString(),
      reviewPreserved: true,
    };
    job.jdAnalysis = refreshed;
    job.requirements = { ...reviewedRequirements, ...compatibilityFields(refreshed) };
    job.skills = [...new Set([...(job.requirements.requiredSkills || []), ...(job.requirements.preferredSkills || [])])];
    job.verification = previousVerification;
    await job.save();
    return res.json({ job: serializeJob(job), message: "AI analysis refreshed. Reviewed fields and verification were preserved." });
  } catch (error) { return next(error); }
};

exports.analyzeRawAdminJob = async (req, res, next) => {
  try {
    const rawText = String(req.body?.rawText || "").trim();
    const sourceUrl = cleanText(req.body?.sourceUrl, 2000) || null;
    if (rawText.length < 20) return res.status(400).json({ message: "Paste a fuller job post so Newbert can extract useful details." });
    if (rawText.length > 20000) return res.status(400).json({ message: "Raw job text is too long. Keep it below 20,000 characters." });
    if (sourceUrl && !validHttpUrl(sourceUrl)) return res.status(400).json({ message: "Use a valid http:// or https:// source URL." });
    const extracted = await analyzeRawJobPost(rawText, { sourceUrl });
    const data = extracted.data;
    const officialUrl = data.officialApplyUrl || data.source?.sourceUrl || null;
    const verificationPreview = verifyJob({ applyUrl: officialUrl, application: { officialUrl }, source: { type: data.source?.detectedProvider || "unknown", sourceUrl: data.source?.sourceUrl } });
    return res.json({ draft: { ...data, rawSourceText: rawText, verificationPreview, extractionSource: extracted.source } });
  } catch (error) { return next(error); }
};
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
    const jdChanged = nextTitle !== job.title || nextCompany !== job.company || nextDescription !== job.description || input.structuredAnalysis !== undefined;
    job.title = nextTitle; job.company = nextCompany; job.description = nextDescription;
    if (input.department !== undefined) job.department = cleanText(input.department, 120) || null;
    if (input.roleCategory !== undefined) job.roleCategory = cleanText(input.roleCategory, 80) || null;
    if (input.location !== undefined) job.location = cleanLocation(input.location);
    if (input.multipleLocations !== undefined) job.multipleLocations = Array.isArray(input.multipleLocations) ? input.multipleLocations.map(cleanLocation).filter(Boolean).slice(0, 20) : [];
    if (["onsite", "hybrid", "remote", "unknown"].includes(input.workMode)) job.workMode = input.workMode;
    if (input.salary !== undefined) job.salary = cleanSalary(input.salary);
    if (input.compensation !== undefined) {
      job.compensation = cleanCompensation(input.compensation);
      if (job.compensation && (job.compensation.minAmount != null || job.compensation.maxAmount != null)) job.salary = { min: job.compensation.minAmount, max: job.compensation.maxAmount, currency: job.compensation.currency, period: job.compensation.period };
    }
    if (input.experience !== undefined) job.experience = cleanExperience(input.experience);
    if (input.deadline !== undefined) { job.deadline = cleanDate(input.deadline); job.application = { ...(job.application || {}), deadline: job.deadline }; }
    if (input.postedDate !== undefined) job.postedAt = cleanDate(input.postedDate);
    if (input.joiningDate !== undefined) job.joiningDate = cleanDate(input.joiningDate);
    if (input.internshipDuration !== undefined) job.internshipDuration = cleanDuration(input.internshipDuration);
    if (["internship", "full-time", "part-time", "contract", "apprenticeship", "temporary", "unknown"].includes(input.employmentType)) job.employmentType = input.employmentType;
    if (["intern", "entry-level", "junior", "mid", "senior", "unspecified"].includes(input.experienceLevel)) job.experienceLevel = input.experienceLevel;
    if (url) { job.applyUrl = url; job.application = { ...(job.application || {}), officialUrl: url }; }
    if (input.sourceUrl || input.sourceType || input.sourceProvider || input.rawSourceText) job.source = { ...(job.source || {}), ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}), ...(input.sourceType ? { type: input.sourceType } : {}), ...(input.sourceProvider ? { provider: input.sourceProvider } : {}), ...(input.rawSourceText ? { rawText: cleanText(input.rawSourceText, 20000) } : {}) };
    if (jdChanged || input.requirements !== undefined) {
      const analysisDescription = cleanText(input.rawSourceText, 20000) || job.source?.rawText || job.description;
      const reviewedDraft = input.structuredAnalysis && typeof input.structuredAnalysis === "object" && !Array.isArray(input.structuredAnalysis) ? normalizeStructuredAnalysis(input.structuredAnalysis, { title: job.title, company: job.company, description: analysisDescription }, "reviewed_ai_draft") : null;
      const extracted = reviewedDraft ? { analysis: reviewedDraft } : await analyzeJobDescription({ title: job.title, company: job.company, description: analysisDescription });
      const requirements = cleanRequirements(input.requirements !== undefined ? input.requirements : job.requirements, extracted.analysis);
      job.jdAnalysis = reviewedAnalysis(extracted.analysis, input, requirements, { title: job.title, company: job.company, description: analysisDescription });
      job.requirements = { ...requirements, ...compatibilityFields(job.jdAnalysis) };
      job.responsibilities = requirements.responsibilities;
      job.qualifications = requirements.qualifications;
      job.projectExpectations = requirements.projectExpectations;
      job.selectionProcess = requirements.selectionProcess;
      job.benefits = requirements.benefits;
      job.skills = [...new Set([...(job.requirements.requiredSkills || []), ...(job.requirements.preferredSkills || [])])];
    }
    if (input.companyDescription !== undefined) job.companyDescription = cleanText(input.companyDescription, 3000) || null;
    if (input.applicationInstructions !== undefined) { job.applicationInstructions = cleanText(input.applicationInstructions, 3000) || null; job.application = { ...(job.application || {}), instructions: job.applicationInstructions }; }
    job.verification = verifyJob(job);
    job.active = !["expired", "rejected"].includes(job.verification.status);
    await job.save();
    return res.json({ job: serializeJob(job) });
  } catch (error) { return next(error); }
};
exports.updateAdminJobStatus = async (req, res, next) => { try { const job = await Job.findById(req.params.id); const allowed = ["verified", "source_confirmed", "pending", "rejected", "expired"]; if (!job) return res.status(404).json({ message: "Job not found." }); if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Choose a valid verification status." }); job.verification = { ...(job.verification || {}), status: req.body.status, checkedBy: String(req.auth.id), method: "manual", lastCheckedAt: new Date(), ...(req.body.status === "verified" ? { verifiedAt: new Date() } : {}) }; job.active = req.body.status !== "expired" && req.body.status !== "rejected"; await job.save(); res.json({ job: serializeJob(job) }); } catch (error) { next(error); } };
exports.deleteAdminJob = async (req, res, next) => { try { const job = await Job.findByIdAndDelete(req.params.id); if (!job) return res.status(404).json({ message: "Job not found." }); await SavedJob.deleteMany({ jobId: job._id }); res.status(204).end(); } catch (error) { next(error); } };
