const crypto = require("crypto");
const Job = require("../Models/Job");
const TargetBenchmark = require("../Models/TargetBenchmark");
const { getRoleCategories, roleKey } = require("../data/roleBaselines");
const { normalizeJobRequirements } = require("./jobRequirementEvidenceService");
const { normalizeSkill } = require("./skillNormalizationService");

const CACHE_DAYS = 7;
const IMPORTANCE_RANK = Object.freeze({ low: 1, medium: 2, high: 3, critical: 4 });
const JD_IMPORTANCE = Object.freeze({ optional: "low", preferred: "medium", baseline: "medium", required: "high", critical: "critical" });
const CATEGORY_LABELS = Object.freeze({
  dsa: "DSA / problem solving", programming: "Programming", csFundamentals: "CS fundamentals",
  dbms: "DBMS / databases", oop: "OOP", operatingSystems: "Operating systems",
  computerNetworks: "Computer networks", development: "Development", frontend: "Frontend",
  backend: "Backend / APIs", projects: "Projects", systemDesign: "System design",
  aptitude: "Aptitude", communication: "Communication", interviewPreparation: "Interview preparation",
  statistics: "Statistics", machineLearning: "Machine learning", data: "Data handling",
  cloud: "Cloud", devops: "DevOps", mobile: "Mobile development",
  engineeringMathematics: "Engineering mathematics", coreSubjects: "Core branch subjects",
  pyq: "Previous year questions", mockTests: "Mock tests", revision: "Revision",
});

function text(value) { return String(value || "").trim(); }
function escapeRegex(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function categoryFor(requirement = {}) {
  if (requirement.category && CATEGORY_LABELS[requirement.category]) return requirement.category;
  const value = normalizeSkill(requirement.normalizedSkill || requirement.skill || requirement.label);
  if (/dsa|datastructure|algorithm|problemsolving|graph|tree/.test(value)) return "dsa";
  if (/dbms|database|sql|postgres|mysql|mongo/.test(value)) return "dbms";
  if (/objectoriented|\boop\b/.test(value)) return "oop";
  if (/operatingsystem|\bos\b|linux/.test(value)) return "operatingSystems";
  if (/network|tcp|http/.test(value)) return "computerNetworks";
  if (/react|frontend|javascript|typescript|html|css|browser/.test(value)) return "frontend";
  if (/backend|node|express|api|authentication|java|spring|django|fastapi|flask/.test(value)) return "backend";
  if (/project|portfolio/.test(value)) return "projects";
  if (/systemdesign|architecture|scalab/.test(value)) return "systemDesign";
  if (/aptitude|reasoning/.test(value)) return "aptitude";
  if (/communication|presentation/.test(value)) return "communication";
  if (/interview|mock/.test(value)) return "interviewPreparation";
  if (/statistics|probability/.test(value)) return "statistics";
  if (/machinelearning|deeplearning|scikitlearn|tensorflow|pytorch/.test(value)) return "machineLearning";
  if (/datahandling|pandas|visualization|spreadsheet/.test(value)) return "data";
  if (/cloud|aws|azure|gcp/.test(value)) return "cloud";
  if (/docker|container|cicd|devops|kubernetes/.test(value)) return "devops";
  if (/android|kotlin|mobile/.test(value)) return "mobile";
  if (/engineeringmathematics/.test(value)) return "engineeringMathematics";
  if (/coresubject/.test(value)) return "coreSubjects";
  if (/previousyear|pyq/.test(value)) return "pyq";
  if (/mocktest|testseries/.test(value)) return "mockTests";
  if (/revision/.test(value)) return "revision";
  if (/programming|python|java|cplusplus|\bc\b/.test(value)) return "programming";
  if (requirement.category === "cs-fundamental" || /fundamental/.test(value)) return "csFundamentals";
  return "development";
}

function cacheKey(target = {}) {
  return crypto.createHash("sha1").update(JSON.stringify({
    role: roleKey(target.role), company: text(target.company).toLowerCase(),
    targetType: target.targetType || "role_only", companyCategory: text(target.companyCategory).toLowerCase(),
    region: text(target.region).toLowerCase(),
  })).digest("hex");
}

function buildTargetBenchmark({ target, jobs = [], alumni = [] }) {
  const roleCategories = getRoleCategories(target.role);
  const exactJobs = jobs.filter((job) => !target.company || text(job.company).toLowerCase() === text(target.company).toLowerCase());
  const requirementRows = exactJobs.flatMap((job) => normalizeJobRequirements(job).map((requirement) => ({
    ...requirement, categoryKey: categoryFor(requirement), jobId: String(job._id || job.id || ""),
    jobTitle: job.title, company: job.company, sourceUrl: job.source?.sourceUrl || job.application?.officialUrl || job.applyUrl || null,
  })));
  const categoryMap = new Map(roleCategories.map((category) => [category.key, { ...category, evidence: [], mentionCount: 0, jobCount: exactJobs.length }]));
  for (const requirement of requirementRows) {
    const importance = JD_IMPORTANCE[requirement.importance] || "medium";
    const current = categoryMap.get(requirement.categoryKey) || {
      key: requirement.categoryKey, label: CATEGORY_LABELS[requirement.categoryKey] || requirement.label,
      importance: "low", confidence: "low", source: "official_job", reason: "Present in current verified Newbert job evidence.", evidence: [], mentionCount: 0, jobCount: exactJobs.length,
    };
    if (IMPORTANCE_RANK[importance] > IMPORTANCE_RANK[current.importance]) current.importance = importance;
    current.source = "official_job";
    current.confidence = requirement.confidence >= 0.9 || requirement.confidence === "high" ? "high" : "medium";
    current.mentionCount += 1;
    current.evidence.push({
      level: "A", source: "official_job", label: `${requirement.company} · ${requirement.jobTitle}`,
      detail: requirement.evidenceText || `${requirement.label} is listed in this verified job record.`,
      sourceUrl: requirement.sourceUrl, jobId: requirement.jobId,
    });
    current.reason = `Mentioned in ${current.mentionCount}/${Math.max(1, exactJobs.length)} current relevant verified job description${exactJobs.length === 1 ? "" : "s"}.`;
    categoryMap.set(current.key, current);
  }

  const realAlumni = alumni.filter((item) => item.verified && !item.isDummyData);
  const exactAlumni = realAlumni.filter((item) => !target.company || text(item.placement?.company || item.company).toLowerCase() === text(target.company).toLowerCase());
  const sourceLayer = exactJobs.length ? "exact_company_role_jobs" : exactAlumni.length ? "verified_alumni" : target.companyCategory ? "company_category_role" : "role_baseline";
  const confidence = exactJobs.length >= 2 ? "high" : exactJobs.length || exactAlumni.length ? "medium" : "low";
  const fallbackMessage = exactJobs.length ? null : target.company
    ? `No current exact-company job description was available. This benchmark uses ${exactAlumni.length ? "verified alumni signals and the" : "the"} ${target.companyCategory ? `${target.companyCategory} ` : ""}${target.role} role baseline.`
    : "No exact company was selected. This is an exploratory role-level benchmark.";
  return {
    cacheKey: cacheKey(target), company: target.company || null, role: target.role,
    normalizedRole: roleKey(target.role), targetType: target.targetType || "role_only",
    companyCategory: target.companyCategory || null, region: target.region || null,
    categories: [...categoryMap.values()].sort((a, b) => IMPORTANCE_RANK[b.importance] - IMPORTANCE_RANK[a.importance] || a.label.localeCompare(b.label)),
    requirements: requirementRows, confidence, sourceLayer, fallbackMessage,
    evidenceSummary: { officialJobs: exactJobs.length, verifiedAlumni: exactAlumni.length, publicSignals: 0 },
    sourceVersion: "target-benchmark-v1", lastRefreshedAt: new Date(),
    expiresAt: new Date(Date.now() + CACHE_DAYS * 86400000),
  };
}

async function findRelevantJobs(target) {
  if (!target.company) return [];
  const jobs = await Job.find({
    active: true,
    company: { $regex: `^${escapeRegex(target.company)}$`, $options: "i" },
    "verification.status": { $in: ["verified", "source_confirmed"] },
  }).sort({ postedAt: -1, createdAt: -1 }).limit(12).lean();
  const wanted = roleKey(target.role);
  return jobs.filter((job) => roleKey(job.roleCategory || job.title) === wanted).slice(0, 6);
}

async function resolveTargetBenchmark({ target, selectedJobs = [], alumni = [], force = false }) {
  const key = cacheKey(target);
  if (!force && !selectedJobs.length) {
    const cached = await TargetBenchmark.findOne({ cacheKey: key, expiresAt: { $gt: new Date() } }).lean();
    if (cached) return cached;
  }
  const discovered = await findRelevantJobs(target);
  const jobs = [...new Map([...selectedJobs, ...discovered].map((job) => [String(job._id || job.id), job])).values()];
  const benchmark = buildTargetBenchmark({ target, jobs, alumni });
  return TargetBenchmark.findOneAndUpdate({ cacheKey: key }, { $set: benchmark }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }).lean();
}

module.exports = { CACHE_DAYS, CATEGORY_LABELS, buildTargetBenchmark, cacheKey, categoryFor, resolveTargetBenchmark };
