const crypto = require("crypto");
const { generateAI } = require("./ai/aiService");
const { buildJobDescriptionPrompt } = require("./ai/prompts");
const { buildRawJobPostPrompt } = require("./ai/prompts");
const { DEFAULT_MODEL } = require("./ai/geminiProvider");
const { normalizeSkill, normalizeSkillList, skillLabel } = require("./skillNormalizationService");

function parse(text) { const match = String(text || "").match(/\{[\s\S]*\}/); if (!match) return null; try { return JSON.parse(match[0]); } catch { return null; } }
const IMPORTANCE = new Set(["critical", "required", "preferred", "optional"]);
const CONFIDENCE = new Set(["high", "medium", "low"]);
const CATEGORIES = new Set(["technical", "cs-fundamental", "fundamental", "tool", "framework", "cloud", "database", "soft-skill", "domain", "other"]);
const EMPLOYMENT_TYPES = new Set(["full-time", "part-time", "internship", "contract", "apprenticeship", "temporary", "unknown"]);
const WORK_MODES = new Set(["onsite", "hybrid", "remote", "unknown"]);
const EXPERIENCE_LEVELS = new Set(["intern", "entry-level", "junior", "mid", "senior", "unspecified"]);
const COMPENSATION_TYPES = new Set(["salary", "stipend", "unknown"]);
const COMPENSATION_PERIODS = new Set(["hourly", "monthly", "yearly", "total", "unknown"]);
const DURATION_UNITS = new Set(["days", "weeks", "months", "years"]);
const IMPORTANCE_RANK = { critical: 4, required: 3, preferred: 2, optional: 1 };
const SKILL_CATALOG = ["JavaScript", "TypeScript", "React", "Node.js", "Express", "Python", "Java", "C++", "SQL", "PostgreSQL", "MySQL", "MongoDB", "Docker", "AWS", "Git", "REST APIs", "scikit-learn", "Machine Learning", "DBMS", "Operating Systems", "Computer Networks", "DSA", "Testing"];

function textList(value, limit = 30) { return Array.isArray(value) ? [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))].slice(0, limit) : []; }
function compact(value) { return String(value || "").trim().replace(/\s+/g, " "); }
function sentences(description) { return String(description || "").split(/(?<=[.!?])\s+|\r?\n+/).map(compact).filter(Boolean); }
function evidenceFor(description, skill) { const canonical = normalizeSkill(skill); return sentences(description).find((sentence) => normalizeSkillList(SKILL_CATALOG.filter((item) => sentence.toLowerCase().includes(item.toLowerCase()))).includes(canonical) || sentence.toLowerCase().includes(String(skill).toLowerCase()))?.slice(0, 300) || ""; }
function evidenceIsPresent(description, evidenceText) { const source = compact(description).toLowerCase(); const evidence = compact(evidenceText).toLowerCase(); return Boolean(evidence && source.includes(evidence)); }
function requirementId(canonicalSkill) { return `req-${crypto.createHash("sha1").update(canonicalSkill).digest("hex").slice(0, 10)}`; }
function explicitList(value, description, limit = 30) { const source = compact(description).toLowerCase(); return textList(value, limit).filter((item) => source.includes(compact(item).toLowerCase())); }
function rawJdHash(description) { return crypto.createHash("sha256").update(String(description || "")).digest("hex"); }
function cleanNumber(value, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) { const number = value == null || value === "" ? null : Number(value); return Number.isFinite(number) && number >= min && number <= max ? number : null; }
function cleanDateValue(value) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null; const date = new Date(`${value}T00:00:00.000Z`); return Number.isNaN(date.getTime()) ? null : String(value); }
function cleanUrl(value) { try { const url = new URL(String(value || "")); return ["http:", "https:"].includes(url.protocol) ? url.toString() : null; } catch { return null; } }
function uniqueObjects(values = []) { const seen = new Set(); return values.filter((item) => { const key = JSON.stringify(item); if (seen.has(key)) return false; seen.add(key); return true; }); }

function normalizeFieldEvidence(value, description) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const field = compact(item?.field); const evidenceText = compact(item?.evidenceText);
    if (!field || !evidenceIsPresent(description, evidenceText)) return null;
    return { field, evidenceText: evidenceText.slice(0, 300), confidence: CONFIDENCE.has(item?.confidence) ? item.confidence : "medium", source: "ai_extracted" };
  }).filter(Boolean).slice(0, 80);
}
function fieldHasEvidence(fieldEvidence, field) { return fieldEvidence.some((item) => item.field === field || item.field.startsWith(`${field}.`) || field.startsWith(`${item.field}.`)); }
function trustedScalar(value, field, description, fieldEvidence, strict, fallback = null) { const cleaned = compact(value); if (!cleaned || cleaned === "unknown" || cleaned === "not specified") return fallback; return !strict || fieldHasEvidence(fieldEvidence, field) || evidenceFor(description, cleaned) ? cleaned : fallback; }
function trustedList(value, field, description, fieldEvidence, strict, normalizer = textList) { const cleaned = normalizer(value); if (!cleaned.length) return []; return !strict || fieldHasEvidence(fieldEvidence, field) ? cleaned : cleaned.filter((item) => evidenceFor(description, item)); }
function trustedUrl(value, field, description, fieldEvidence, strict) { const url = cleanUrl(value); if (!url) return null; return !strict || fieldHasEvidence(fieldEvidence, field) || String(description).includes(String(value)) ? url : null; }
function cleanLocation(value) { if (!value || typeof value !== "object" || Array.isArray(value)) return { city: null, state: null, country: null, raw: null }; const location = { city: compact(value.city) || null, state: compact(value.state) || null, country: compact(value.country) || null, raw: compact(value.raw) || null }; if (!location.raw) location.raw = [location.city, location.state, location.country].filter(Boolean).join(", ") || null; return location; }

function normalizeRequirement(value, description) {
  const canonicalSkill = normalizeSkill(value?.canonicalSkill || value?.label || value);
  if (!canonicalSkill) return null;
  const proposedEvidence = compact(value?.evidenceText);
  const validEvidence = evidenceIsPresent(description, proposedEvidence) ? proposedEvidence : evidenceFor(description, value?.label || value?.canonicalSkill || value);
  const importance = IMPORTANCE.has(value?.importance) ? value.importance : "required";
  const requestedConfidence = CONFIDENCE.has(value?.confidence) ? value.confidence : validEvidence ? "medium" : "low";
  const confidence = validEvidence ? requestedConfidence : "low";
  const requestedCategory = value?.category === "fundamental" ? "cs-fundamental" : value?.category;
  return {
    id: requirementId(canonicalSkill),
    canonicalSkill,
    label: compact(value?.label) || skillLabel(canonicalSkill),
    category: CATEGORIES.has(requestedCategory) ? requestedCategory : "technical",
    importance,
    evidenceText: validEvidence,
    confidence,
    scoreEligible: Boolean(validEvidence && confidence !== "low"),
    source: value?.source === "manual_override" || value?.source === "manual" ? "manual" : value?.source === "inferred" ? "inferred" : "explicit",
  };
}

function dedupeRequirements(requirements) {
  const bySkill = new Map();
  for (const requirement of requirements.filter(Boolean)) {
    const current = bySkill.get(requirement.canonicalSkill);
    if (!current || IMPORTANCE_RANK[requirement.importance] > IMPORTANCE_RANK[current.importance] || (!current.scoreEligible && requirement.scoreEligible)) bySkill.set(requirement.canonicalSkill, requirement);
  }
  return [...bySkill.values()];
}

function cleanCgpa(value) { const number = value == null || value === "" ? null : Number(value); return Number.isFinite(number) && number >= 0 && number <= 10 ? number : null; }
function cleanYears(value) { return textList(value).map(Number).filter((year) => Number.isInteger(year) && year >= 2000 && year <= 2100); }
function cleanCompensation(value = {}, fieldEvidence = [], strict = false) {
  if (strict && !fieldHasEvidence(fieldEvidence, "compensation")) return { type: "unknown", currency: null, minAmount: null, maxAmount: null, period: "unknown", ppoAvailable: null, bonus: null, equity: null };
  let minAmount = cleanNumber(value?.minAmount); let maxAmount = cleanNumber(value?.maxAmount);
  if (minAmount != null && maxAmount != null && maxAmount < minAmount) [minAmount, maxAmount] = [maxAmount, minAmount];
  return { type: COMPENSATION_TYPES.has(value?.type) ? value.type : "unknown", currency: compact(value?.currency).toUpperCase() || null, minAmount, maxAmount, period: COMPENSATION_PERIODS.has(value?.period) ? value.period : "unknown", ppoAvailable: typeof value?.ppoAvailable === "boolean" ? value.ppoAvailable : null, bonus: compact(value?.bonus) || null, equity: compact(value?.equity) || null };
}
function cleanDuration(value) { const amount = cleanNumber(value?.value, { min: 1, max: 120 }); const unit = DURATION_UNITS.has(value?.unit) ? value.unit : null; return amount && unit ? { value: amount, unit } : { value: null, unit: null }; }
function overallConfidence(fieldEvidence, requirements) { const levels = [...fieldEvidence, ...requirements.filter((item) => item.evidenceText)].map((item) => item.confidence); if (!levels.length) return "low"; const score = levels.reduce((sum, level) => sum + ({ high: 1, medium: 0.6, low: 0.2 }[level] || 0), 0) / levels.length; return score >= 0.8 ? "high" : score >= 0.45 ? "medium" : "low"; }
function compatibilityFields(analysis) {
  const requiredSkills = analysis.requirements.filter((item) => ["critical", "required"].includes(item.importance)).map((item) => item.label);
  const preferredSkills = analysis.requirements.filter((item) => ["preferred", "optional"].includes(item.importance)).map((item) => item.label);
  const csFundamentals = analysis.requirements.filter((item) => ["cs-fundamental", "fundamental"].includes(item.category)).map((item) => item.label);
  return { requiredSkills, preferredSkills, csFundamentals, minimumCgpa: analysis.eligibility.minimumCgpa, allowedBranches: analysis.eligibility.branches, graduationYears: analysis.eligibility.graduationYears, experienceLevel: analysis.basic?.experienceLevel || "unspecified", responsibilities: analysis.responsibilities };
}

function normalizeStructuredAnalysis(value = {}, input = {}, source = "deterministic") {
  const description = String(input.description || input.rawText || "");
  const strict = ["gemini", "reviewed_ai_draft"].includes(source);
  const fieldEvidence = normalizeFieldEvidence(value.fieldEvidence, description);
  const basicInput = value.basic && typeof value.basic === "object" ? value.basic : value;
  const legacy = [
    ...textList(value.criticalSkills).map((label) => ({ label, importance: "critical", category: "technical" })),
    ...textList(value.requiredSkills).map((label) => ({ label, importance: "required", category: textList(value.csFundamentals).includes(label) ? "cs-fundamental" : "technical" })),
    ...textList(value.preferredSkills).map((label) => ({ label, importance: "preferred", category: "technical" })),
    ...textList(value.optionalSkills).map((label) => ({ label, importance: "optional", category: "technical" })),
  ];
  const requirements = dedupeRequirements([...(Array.isArray(value.requirements) ? value.requirements : []), ...legacy].map((item) => normalizeRequirement(item, description)));
  const rawLocation = cleanLocation(basicInput.location);
  const locationAllowed = !strict || fieldHasEvidence(fieldEvidence, "basic.location") || (rawLocation.raw && evidenceFor(description, rawLocation.raw));
  const multipleLocations = uniqueObjects((Array.isArray(basicInput.multipleLocations) ? basicInput.multipleLocations : []).map(cleanLocation).filter((item) => item.raw)).filter((item) => !strict || fieldHasEvidence(fieldEvidence, "basic.multipleLocations") || evidenceFor(description, item.raw));
  const employmentType = EMPLOYMENT_TYPES.has(basicInput.employmentType) && (!strict || fieldHasEvidence(fieldEvidence, "basic.employmentType")) ? basicInput.employmentType : "unknown";
  const workMode = WORK_MODES.has(basicInput.workMode) && (!strict || fieldHasEvidence(fieldEvidence, "basic.workMode")) ? basicInput.workMode : "unknown";
  const experienceLevel = EXPERIENCE_LEVELS.has(basicInput.experienceLevel) && (!strict || fieldHasEvidence(fieldEvidence, "basic.experienceLevel")) ? basicInput.experienceLevel : "unspecified";
  const experienceInput = basicInput.experience && typeof basicInput.experience === "object" ? basicInput.experience : value.experience || {};
  const experience = (!strict || fieldHasEvidence(fieldEvidence, "basic.experience")) ? { minYears: cleanNumber(experienceInput.minYears, { max: 80 }), maxYears: cleanNumber(experienceInput.maxYears, { max: 80 }) } : { minYears: null, maxYears: null };
  if (experience.minYears != null && experience.maxYears != null && experience.maxYears < experience.minYears) [experience.minYears, experience.maxYears] = [experience.maxYears, experience.minYears];
  const eligibilityInput = value.eligibility && typeof value.eligibility === "object" ? value.eligibility : value;
  const eligibility = {
    degrees: trustedList(eligibilityInput.degrees, "eligibility.degrees", description, fieldEvidence, strict),
    branches: trustedList(eligibilityInput.branches || eligibilityInput.allowedBranches, "eligibility.branches", description, fieldEvidence, strict),
    graduationYears: trustedList(eligibilityInput.graduationYears, "eligibility.graduationYears", description, fieldEvidence, strict, cleanYears),
    minimumCgpa: (!strict || fieldHasEvidence(fieldEvidence, "eligibility.minimumCgpa")) ? cleanCgpa(eligibilityInput.minimumCgpa) : null,
    maximumCgpa: (!strict || fieldHasEvidence(fieldEvidence, "eligibility.maximumCgpa")) ? cleanCgpa(eligibilityInput.maximumCgpa) : null,
    backlogPolicy: trustedScalar(eligibilityInput.backlogPolicy, "eligibility.backlogPolicy", description, fieldEvidence, strict),
    workAuthorization: trustedScalar(eligibilityInput.workAuthorization, "eligibility.workAuthorization", description, fieldEvidence, strict),
    locationRestrictions: trustedList(eligibilityInput.locationRestrictions, "eligibility.locationRestrictions", description, fieldEvidence, strict),
    otherEligibility: trustedList(eligibilityInput.otherEligibility || eligibilityInput.other, "eligibility.otherEligibility", description, fieldEvidence, strict),
  };
  eligibility.other = eligibility.otherEligibility;
  const compensation = cleanCompensation(value.compensation || {}, fieldEvidence, strict);
  const dateInput = value.dates && typeof value.dates === "object" ? value.dates : value;
  const dates = { postedDate: (!strict || fieldHasEvidence(fieldEvidence, "dates.postedDate")) ? cleanDateValue(dateInput.postedDate) : null, applicationDeadline: (!strict || fieldHasEvidence(fieldEvidence, "dates.applicationDeadline")) ? cleanDateValue(dateInput.applicationDeadline || dateInput.deadline) : null, joiningDate: (!strict || fieldHasEvidence(fieldEvidence, "dates.joiningDate")) ? cleanDateValue(dateInput.joiningDate) : null, internshipDuration: (!strict || fieldHasEvidence(fieldEvidence, "dates.internshipDuration")) ? cleanDuration(dateInput.internshipDuration) : { value: null, unit: null } };
  const basic = {
    companyName: trustedScalar(basicInput.companyName || basicInput.company, "basic.companyName", description, fieldEvidence, strict, compact(input.company) || null),
    jobTitle: trustedScalar(basicInput.jobTitle || basicInput.title || value.role, "basic.jobTitle", description, fieldEvidence, strict, compact(input.title) || null),
    department: trustedScalar(basicInput.department, "basic.department", description, fieldEvidence, strict),
    roleCategory: trustedScalar(basicInput.roleCategory, "basic.roleCategory", description, fieldEvidence, strict),
    employmentType, workMode,
    location: locationAllowed ? rawLocation : { city: null, state: null, country: null, raw: null },
    multipleLocations, experienceLevel, experience,
  };
  const sectionList = (items, limit) => strict ? explicitList(items, description, limit) : textList(items, limit);
  const analysis = {
    role: basic.jobTitle, basic, compensation, dates, eligibility, requirements, experience,
    responsibilities: sectionList(value.responsibilities, 30),
    qualifications: sectionList(value.qualifications, 30),
    projectExpectations: sectionList(value.projectExpectations, 20),
    selectionProcess: sectionList(value.selectionProcess, 20),
    benefits: sectionList(value.benefits, 20),
    companyDescription: !strict || evidenceIsPresent(description, value.companyDescription) ? compact(value.companyDescription) || null : null,
    applicationInstructions: !strict || evidenceIsPresent(description, value.applicationInstructions) ? compact(value.applicationInstructions) || null : null,
    application: { officialApplyUrl: trustedUrl(value.application?.officialApplyUrl || value.officialApplyUrl, "application.officialApplyUrl", description, fieldEvidence, strict), sourceUrl: trustedUrl(value.application?.sourceUrl || value.sourceUrl, "application.sourceUrl", description, fieldEvidence, strict) },
    fieldEvidence,
    source: value.source && typeof value.source === "object" ? value.source : {},
    contact: value.contact && typeof value.contact === "object" ? value.contact : {},
    postedText: compact(value.postedText) || null, applicantText: compact(value.applicantText) || null, hiringActivity: compact(value.hiringActivity) || null,
    metadata: {
      extractionMethod: source,
      model: source === "gemini" ? process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL : null,
      analyzedAt: new Date().toISOString(),
      rawJdHash: rawJdHash(description),
      overallConfidence: overallConfidence(fieldEvidence, requirements),
      schemaVersion: "3.0",
    },
  };
  return { ...analysis, ...compatibilityFields(analysis) };
}

function explicitImportance(sentence) {
  if (/\b(optional|optionally|nice to have|bonus|plus)\b/i.test(sentence)) return "optional";
  if (/\b(preferred|good to have)\b/i.test(sentence)) return "preferred";
  if (/\b(mandatory|critical|essential|must have)\b/i.test(sentence)) return "critical";
  return "required";
}

function deterministicJdFallback(input) {
  const description = String(input.description || "");
  const sourceSentences = sentences(description);
  const requirements = [];
  for (const label of SKILL_CATALOG) {
    const canonical = normalizeSkill(label);
    const evidenceText = sourceSentences.find((sentence) => {
      const lower = sentence.toLowerCase();
      if (canonical === "java") return /\bjava\b/i.test(sentence);
      return lower.includes(label.toLowerCase()) || normalizeSkillList([sentence]).includes(canonical);
    });
    if (evidenceText) requirements.push({ canonicalSkill: canonical, label, category: ["dbms", "operating-systems", "computer-networks", "dsa", "oop"].includes(canonical) ? "fundamental" : "technical", importance: explicitImportance(evidenceText), evidenceText, confidence: /\b(required|must|mandatory|preferred|optional|experience|proficien|knowledge)\b/i.test(evidenceText) ? "high" : "medium" });
  }
  const cgpaMatch = description.match(/(?:minimum|min\.?|at least)\s*(\d(?:\.\d+)?)\s*(?:cgpa|gpa)|(?:cgpa|gpa)\s*(?:of|>=|above|minimum)?\s*(\d(?:\.\d+)?)/i);
  const years = [...description.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1])).filter((year) => /batch|graduat|class of/i.test(description.slice(Math.max(0, description.indexOf(String(year)) - 40), description.indexOf(String(year)) + 40)));
  const degreeMatches = description.match(/\b(B\.?\s?Tech|B\.?E\.?|BCA|MCA|B\.?Sc|M\.?Tech)\b/gi) || [];
  const branchMatches = description.match(/\b(CSE|Computer Science(?: and Engineering)?|Information Technology|IT|ECE|EE|Electrical Engineering|Mechanical Engineering|Civil Engineering)\b/gi) || [];
  const employmentType = /\bapprenticeship\b/i.test(description) ? "apprenticeship" : /\btemporary\b/i.test(description) ? "temporary" : /\bcontract\b/i.test(description) ? "contract" : /\bpart[ -]?time\b/i.test(description) ? "part-time" : /\binternship|intern\b/i.test(description) ? "internship" : /\bfull[ -]?time\b/i.test(description) ? "full-time" : "unknown";
  const workMode = /\bhybrid\b/i.test(description) ? "hybrid" : /\bremote(?:ly)?\b/i.test(description) ? "remote" : /\bon[ -]?site|onsite\b/i.test(description) ? "onsite" : "unknown";
  const compensationMatch = description.match(/(?:₹|INR\s*)\s*([\d,]+)(?:\s*(?:-|–|to)\s*(?:₹|INR\s*)?([\d,]+))?\s*(?:\/|per\s*)?(month|monthly|year|yearly|annum|hour|hourly)?/i);
  const periodWord = compensationMatch?.[3]?.toLowerCase();
  const compensation = compensationMatch ? { type: /intern|stipend/i.test(description) ? "stipend" : "salary", currency: "INR", minAmount: Number(compensationMatch[1].replaceAll(",", "")), maxAmount: Number((compensationMatch[2] || compensationMatch[1]).replaceAll(",", "")), period: /month/.test(periodWord) ? "monthly" : /year|annum/.test(periodWord) ? "yearly" : /hour/.test(periodWord) ? "hourly" : "unknown", ppoAvailable: /\bno\s+ppo\b/i.test(description) ? false : /\bppo\b/i.test(description) ? true : null } : {};
  const durationMatch = description.match(/\b(\d+)\s*[- ]?(day|week|month|year)s?\s+(?:internship|intern)\b/i);
  const fieldEvidence = [];
  const addEvidence = (field, evidenceText) => { if (evidenceText) fieldEvidence.push({ field, evidenceText, confidence: "high" }); };
  addEvidence("basic.employmentType", sourceSentences.find((sentence) => employmentType !== "unknown" && new RegExp(employmentType.replace("-", "[ -]?"), "i").test(sentence)));
  addEvidence("basic.workMode", sourceSentences.find((sentence) => workMode !== "unknown" && new RegExp(workMode === "onsite" ? "on[ -]?site|onsite" : workMode === "remote" ? "remote(?:ly)?" : workMode, "i").test(sentence)));
  addEvidence("eligibility.minimumCgpa", cgpaMatch?.[0]);
  if (years.length) addEvidence("eligibility.graduationYears", sourceSentences.find((sentence) => years.some((year) => sentence.includes(String(year)))));
  if (degreeMatches.length) addEvidence("eligibility.degrees", sourceSentences.find((sentence) => degreeMatches.some((degree) => sentence.toLowerCase().includes(degree.toLowerCase()))));
  if (branchMatches.length) addEvidence("eligibility.branches", sourceSentences.find((sentence) => branchMatches.some((branch) => sentence.toLowerCase().includes(branch.toLowerCase()))));
  addEvidence("compensation", compensationMatch?.[0]); addEvidence("dates.internshipDuration", durationMatch?.[0]);
  return normalizeStructuredAnalysis({ basic: { companyName: input.company || null, jobTitle: input.title || null, employmentType, workMode, location: {}, multipleLocations: [], experienceLevel: "unspecified", experience: {} }, compensation, dates: { internshipDuration: durationMatch ? { value: Number(durationMatch[1]), unit: `${durationMatch[2].toLowerCase()}s` } : null }, eligibility: { degrees: degreeMatches, branches: branchMatches, graduationYears: years, minimumCgpa: cgpaMatch ? Number(cgpaMatch[1] || cgpaMatch[2]) : null }, requirements, fieldEvidence }, input, "deterministic");
}

function mergeAdminRequirements(baseAnalysis, overrides, input) {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) return baseAnalysis;
  const replacements = [];
  const baseBySkill = new Map((baseAnalysis.requirements || []).map((item) => [item.canonicalSkill, item]));
  const add = (values, importance, category = "technical") => textList(values).forEach((label) => { const prior = baseBySkill.get(normalizeSkill(label)); const foundEvidence = prior?.evidenceText || evidenceFor(input.description, label); replacements.push({ ...prior, label, canonicalSkill: normalizeSkill(label), importance, category: prior?.category || category, evidenceText: foundEvidence, confidence: prior?.confidence || (foundEvidence ? "high" : "medium"), scoreEligible: true, source: "manual" }); });
  add(overrides.criticalSkills, "critical"); add(overrides.requiredSkills, "required"); add(overrides.preferredSkills, "preferred"); add(overrides.optionalSkills, "optional"); add(overrides.csFundamentals, "required", "cs-fundamental");
  const hasRequirementOverride = ["criticalSkills", "requiredSkills", "preferredSkills", "optionalSkills", "csFundamentals"].some((key) => Array.isArray(overrides[key]));
  const value = {
    ...baseAnalysis,
    requirements: hasRequirementOverride ? replacements : baseAnalysis.requirements,
    ...(hasRequirementOverride ? { criticalSkills: textList(overrides.criticalSkills), requiredSkills: textList(overrides.requiredSkills), preferredSkills: textList(overrides.preferredSkills), optionalSkills: textList(overrides.optionalSkills), csFundamentals: textList(overrides.csFundamentals) } : {}),
    eligibility: {
      ...baseAnalysis.eligibility,
      ...(Object.hasOwn(overrides, "degrees") ? { degrees: overrides.degrees } : {}),
      ...(Object.hasOwn(overrides, "allowedBranches") ? { branches: overrides.allowedBranches } : {}),
      ...(Object.hasOwn(overrides, "graduationYears") ? { graduationYears: overrides.graduationYears } : {}),
      ...(Object.hasOwn(overrides, "minimumCgpa") ? { minimumCgpa: overrides.minimumCgpa } : {}),
      ...(Object.hasOwn(overrides, "maximumCgpa") ? { maximumCgpa: overrides.maximumCgpa } : {}),
      ...(Object.hasOwn(overrides, "backlogPolicy") ? { backlogPolicy: overrides.backlogPolicy } : {}),
      ...(Object.hasOwn(overrides, "workAuthorization") ? { workAuthorization: overrides.workAuthorization } : {}),
      ...(Object.hasOwn(overrides, "locationRestrictions") ? { locationRestrictions: overrides.locationRestrictions } : {}),
      ...(Object.hasOwn(overrides, "otherEligibility") ? { otherEligibility: overrides.otherEligibility } : {}),
    },
    responsibilities: Array.isArray(overrides.responsibilities) ? overrides.responsibilities : baseAnalysis.responsibilities,
    qualifications: Array.isArray(overrides.qualifications) ? overrides.qualifications : baseAnalysis.qualifications,
    projectExpectations: Array.isArray(overrides.projectExpectations) ? overrides.projectExpectations : baseAnalysis.projectExpectations,
    selectionProcess: Array.isArray(overrides.selectionProcess) ? overrides.selectionProcess : baseAnalysis.selectionProcess,
    benefits: Array.isArray(overrides.benefits) ? overrides.benefits : baseAnalysis.benefits,
  };
  const merged = normalizeStructuredAnalysis(value, input, hasRequirementOverride ? "admin_override" : baseAnalysis.metadata?.extractionMethod || "deterministic");
  merged.metadata = { ...baseAnalysis.metadata, ...merged.metadata, extractionMethod: hasRequirementOverride ? "admin_override" : baseAnalysis.metadata?.extractionMethod || "deterministic" };
  return merged;
}

async function analyzeJobDescription(input, options = {}) {
  const safeFallback = deterministicJdFallback(input);
  const generate = options.generate || generateAI;
  if (!options.generate && !process.env.GEMINI_API_KEY) return { analysis: safeFallback, source: "deterministic", aiAnalysisAvailable: false };
  try {
    const text = await generate({ prompt: buildJobDescriptionPrompt(input), task: "job-jd-analysis", timeoutMs: 15000 });
    const parsed = parse(text);
    if (!parsed) return { analysis: safeFallback, source: "deterministic", aiAnalysisAvailable: false };
    return { analysis: normalizeStructuredAnalysis(parsed, input, "gemini"), source: "gemini", aiAnalysisAvailable: true };
  } catch { return { analysis: safeFallback, source: "deterministic", aiAnalysisAvailable: false }; }
}
function urls(text) { return [...String(text || "").matchAll(/https?:\/\/[^\s<>"']+/gi)].map((match) => match[0].replace(/[),.;]+$/, "")); }
function rawFallback(rawText) { const text = String(rawText || "").slice(0, 20000); const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean); const allUrls = urls(text); const linkedIn = allUrls.find((url) => /linkedin\.com\/jobs\/view\//i.test(url)); const jobId = linkedIn?.match(/jobs\/view\/(\d+)/i)?.[1] || null; const canonicalLinkedIn = jobId ? `https://www.linkedin.com/jobs/view/${jobId}/` : linkedIn || null; const official = allUrls.find((url) => !/linkedin\.com/i.test(url) && /(apply|career|job|greenhouse|lever|ashby|workday)/i.test(url)) || null; const title = lines.find((line) => /\b(developer|engineer|designer|analyst|intern|manager)\b/i.test(line)) || null; const company = title ? lines[Math.max(0, lines.indexOf(title) - 1)] || null : null; const location = lines.find((line) => /india|remote|hybrid|on-site|onsite/i.test(line) && line.length < 100) || null; const employmentType = /full[ -]?time/i.test(text) ? "full-time" : /internship|intern\b/i.test(text) ? "internship" : null; const workMode = /on[ -]?site/i.test(text) ? "on-site" : /hybrid/i.test(text) ? "hybrid" : /remote/i.test(text) ? "remote" : null; const education = [...new Set((text.match(/\b(B\.?Tech|BCA|MCA|BE|B\.?Sc)\b/gi) || []).map((item) => item.replace(/\./g, "")))]; const skills = ["html", "css", "javascript", "typescript", "react", "node.js", "sql", "figma", "responsive design", "ui/ux design", "frontend frameworks"].filter((skill) => text.toLowerCase().includes(skill)); const phone = text.match(/(?:whatsapp|phone)\s*[:\-]?\s*(\+?\d[\d\s-]{7,})/i)?.[1]?.replace(/\D/g, "") || null; return { title, company, location: { city: location?.split(",")[0] || null, state: location?.split(",")[1]?.trim() || null, country: /india/i.test(location || "") ? "India" : null, raw: location }, workMode, employmentType, experienceLevel: null, education, requiredSkills: [], preferredSkills: [], generalSkills: skills, csFundamentals: [], responsibilities: [], summary: null, salary: null, deadline: null, postedText: text.match(/\b\d+\s+days?\s+ago\b/i)?.[0] || null, applicantText: text.match(/\b(?:over\s+)?\d+\+?\s+applicants?\b/i)?.[0] || null, hiringActivity: /actively reviewing applicants/i.test(text) ? "Actively reviewing applicants" : null, officialApplyUrl: official, contact: { email: text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] || null, phone: null, whatsapp: phone }, source: { detectedProvider: linkedIn ? "linkedin" : official ? "company-careers" : /whatsapp/i.test(text) ? "whatsapp" : "unknown", linkedinJobId: jobId, linkedinJobUrl: canonicalLinkedIn, sourceUrl: canonicalLinkedIn || official || allUrls[0] || null } }; }
function normalizeExtractedJobData(value, fallbackValue) { const data = { ...fallbackValue, ...(value || {}) }; const rawLocation = String(data.location?.raw || data.location || ""); const hasMetadata = /[·|]/.test(rawLocation); const pieces = rawLocation.split(/\s*[·|]\s*/); const geographic = pieces.shift()?.trim() || null; const metadata = pieces.join(" · "); const posted = data.postedText || metadata.match(/\b\d+\s+(?:minutes?|hours?|days?|weeks?|months?)\s+ago\b/i)?.[0] || null; const applicants = data.applicantText || metadata.match(/\b(?:over\s+)?\d+[+,]?\s+(?:people\s+clicked|applicants?)\b/i)?.[0] || null; const hiring = data.hiringActivity || metadata.match(/actively reviewing applicants|promoted by hirer/i)?.[0] || null; const parts = geographic?.split(",").map((part) => part.trim()).filter(Boolean) || []; return { ...data, location: { city: hasMetadata ? parts[0] || null : data.location?.city || parts[0] || null, state: hasMetadata ? (parts.length > 2 ? parts[1] : null) : data.location?.state || (parts.length > 2 ? parts[1] : null), country: hasMetadata ? parts.find((part) => /^india$/i.test(part)) || null : data.location?.country || parts.find((part) => /^india$/i.test(part)) || null, raw: geographic }, postedText: posted, applicantText: applicants, hiringActivity: hiring, requiredSkills: normalizeSkillList(data.requiredSkills), preferredSkills: normalizeSkillList(data.preferredSkills), generalSkills: normalizeSkillList(data.generalSkills), csFundamentals: normalizeSkillList(data.csFundamentals), education: Array.isArray(data.education) ? data.education.map(String).filter(Boolean) : [], responsibilities: Array.isArray(data.responsibilities) ? data.responsibilities.map(String).filter(Boolean).slice(0, 20) : [], source: { ...fallbackValue.source, ...(data.source || {}) }, contact: { ...fallbackValue.contact, ...(data.contact || {}) } }; }
const cleanRaw = normalizeExtractedJobData;
async function analyzeRawJobPost(rawText) { const fallbackValue = rawFallback(rawText); if (!process.env.GEMINI_API_KEY) return { data: normalizeExtractedJobData(fallbackValue, fallbackValue), source: "deterministic" }; try { const text = await generateAI({ prompt: buildRawJobPostPrompt(String(rawText).slice(0, 20000)), task: "raw-job-extraction", timeoutMs: 20000 }); return { data: cleanRaw(parse(text), fallbackValue), source: parse(text) ? "gemini" : "deterministic" }; } catch { return { data: normalizeExtractedJobData(fallbackValue, fallbackValue), source: "deterministic" }; } }
function draftFromAnalysis(analysis, rawText = "") {
  const compensation = analysis.compensation || {};
  return {
    title: analysis.basic?.jobTitle || null,
    company: analysis.basic?.companyName || null,
    department: analysis.basic?.department || null,
    roleCategory: analysis.basic?.roleCategory || null,
    location: analysis.basic?.location || { city: null, state: null, country: null, raw: null },
    multipleLocations: analysis.basic?.multipleLocations || [],
    workMode: analysis.basic?.workMode || "unknown",
    employmentType: analysis.basic?.employmentType || "unknown",
    experienceLevel: analysis.basic?.experienceLevel || "unspecified",
    experience: analysis.basic?.experience || { minYears: null, maxYears: null },
    compensation,
    salary: compensation.minAmount == null && compensation.maxAmount == null ? null : { min: compensation.minAmount, max: compensation.maxAmount, currency: compensation.currency, period: compensation.period },
    postedDate: analysis.dates?.postedDate || null,
    deadline: analysis.dates?.applicationDeadline || null,
    joiningDate: analysis.dates?.joiningDate || null,
    internshipDuration: analysis.dates?.internshipDuration || { value: null, unit: null },
    eligibility: analysis.eligibility,
    criticalSkills: analysis.requirements.filter((item) => item.importance === "critical").map((item) => item.label),
    requiredSkills: analysis.requirements.filter((item) => item.importance === "required").map((item) => item.label),
    preferredSkills: analysis.requirements.filter((item) => item.importance === "preferred").map((item) => item.label),
    optionalSkills: analysis.requirements.filter((item) => item.importance === "optional").map((item) => item.label),
    csFundamentals: analysis.csFundamentals || [],
    responsibilities: analysis.responsibilities || [], qualifications: analysis.qualifications || [], projectExpectations: analysis.projectExpectations || [], selectionProcess: analysis.selectionProcess || [], benefits: analysis.benefits || [],
    companyDescription: analysis.companyDescription || null, applicationInstructions: analysis.applicationInstructions || null,
    officialApplyUrl: analysis.application?.officialApplyUrl || null,
    source: { ...(analysis.source || {}), sourceUrl: analysis.application?.sourceUrl || null },
    contact: analysis.contact || {}, postedText: analysis.postedText || null, applicantText: analysis.applicantText || null, hiringActivity: analysis.hiringActivity || null,
    structuredExtraction: analysis,
    rawJdHash: analysis.metadata?.rawJdHash || rawJdHash(rawText),
  };
}

function rawFallbackV3(rawText, sourceUrl = null) {
  const text = String(rawText || "").slice(0, 20000);
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const allUrls = [...urls(text), cleanUrl(sourceUrl)].filter(Boolean);
  const linkedIn = allUrls.find((url) => /linkedin\.com\/jobs\/view\//i.test(url));
  const jobId = linkedIn?.match(/jobs\/view\/(\d+)/i)?.[1] || null;
  const canonicalLinkedIn = jobId ? `https://www.linkedin.com/jobs/view/${jobId}/` : linkedIn || null;
  const official = allUrls.find((url) => !/linkedin\.com/i.test(url) && /(apply|career|job|greenhouse|lever|ashby|workday)/i.test(url)) || cleanUrl(sourceUrl);
  const title = lines.find((line) => /\b(developer|engineer|designer|analyst|intern|manager|associate)\b/i.test(line) && line.length < 140) || null;
  const company = title ? lines[Math.max(0, lines.indexOf(title) - 1)] || null : null;
  const locationLine = lines.find((line) => /\b(india|remote|hybrid|on[ -]?site)\b/i.test(line) && line.length < 160) || null;
  const structuredExtraction = deterministicJdFallback({ title, company, description: text });
  if (locationLine && !/^(remote|hybrid|on[ -]?site)$/i.test(locationLine)) structuredExtraction.basic.location = cleanLocation({ raw: locationLine });
  structuredExtraction.application = { officialApplyUrl: official, sourceUrl: cleanUrl(sourceUrl) || canonicalLinkedIn || official || allUrls[0] || null };
  structuredExtraction.source = { detectedProvider: linkedIn ? "linkedin" : official ? "company-careers" : /whatsapp/i.test(text) ? "whatsapp" : "unknown", linkedinJobId: jobId, linkedinJobUrl: canonicalLinkedIn };
  structuredExtraction.contact = { email: text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] || null, phone: null, whatsapp: text.match(/(?:whatsapp|phone)\s*[:\-]?\s*(\+?\d[\d\s-]{7,})/i)?.[1]?.replace(/\D/g, "") || null };
  return draftFromAnalysis(structuredExtraction, text);
}

function useful(value) { return value != null && value !== "" && value !== "unknown" && value !== "unspecified"; }
function mergeObject(primary = {}, fallback = {}) { const keys = [...new Set([...Object.keys(fallback || {}), ...Object.keys(primary || {})])]; return Object.fromEntries(keys.map((key) => { const value = primary?.[key]; if (Array.isArray(value)) return [key, value.length ? value : fallback?.[key] || []]; return [key, useful(value) ? value : fallback?.[key] ?? value ?? null]; })); }

function normalizeExtractedJobDataV3(value, fallbackValue, options = {}) {
  const rawText = String(options.rawText || "");
  const legacyValue = value?.basic ? value : { ...value, basic: { companyName: value?.company, jobTitle: value?.title, location: value?.location, multipleLocations: value?.multipleLocations, workMode: value?.workMode, employmentType: value?.employmentType, experienceLevel: value?.experienceLevel, experience: value?.experience }, compensation: value?.compensation || value?.salary, dates: { postedDate: value?.postedDate, applicationDeadline: value?.deadline, joiningDate: value?.joiningDate, internshipDuration: value?.internshipDuration }, eligibility: value?.eligibility || { degrees: value?.education || [] }, application: { officialApplyUrl: value?.officialApplyUrl, sourceUrl: value?.source?.sourceUrl || options.sourceUrl } };
  const normalized = normalizeStructuredAnalysis(legacyValue, { description: rawText }, options.source || "gemini");
  const fallbackAnalysis = fallbackValue?.structuredExtraction || deterministicJdFallback({ description: rawText });
  const requirements = dedupeRequirements([...(normalized.requirements || []), ...(fallbackAnalysis.requirements || [])]);
  const analysis = {
    ...fallbackAnalysis, ...normalized,
    basic: mergeObject(normalized.basic, fallbackAnalysis.basic),
    compensation: mergeObject(normalized.compensation, fallbackAnalysis.compensation),
    dates: mergeObject(normalized.dates, fallbackAnalysis.dates),
    eligibility: mergeObject(normalized.eligibility, fallbackAnalysis.eligibility),
    requirements,
    application: mergeObject(normalized.application, fallbackAnalysis.application),
    source: { ...(fallbackAnalysis.source || {}), ...(normalized.source || {}) }, contact: { ...(fallbackAnalysis.contact || {}), ...(normalized.contact || {}) },
    fieldEvidence: [...(normalized.fieldEvidence || []), ...(fallbackAnalysis.fieldEvidence || [])],
    metadata: { ...normalized.metadata, extractionMethod: options.source || "gemini", overallConfidence: overallConfidence([...(normalized.fieldEvidence || []), ...(fallbackAnalysis.fieldEvidence || [])], requirements) },
  };
  Object.assign(analysis, compatibilityFields(analysis));
  const draft = draftFromAnalysis(analysis, rawText);
  return { ...fallbackValue, ...draft, source: { ...(fallbackValue?.source || {}), ...(draft.source || {}), sourceUrl: cleanUrl(options.sourceUrl) || draft.source?.sourceUrl || null } };
}

async function analyzeRawJobPostV3(rawText, options = {}) {
  const text = String(rawText || "").slice(0, 20000);
  const fallback = rawFallbackV3(text, options.sourceUrl);
  const generate = options.generate || generateAI;
  if (!options.generate && !process.env.GEMINI_API_KEY) return { data: { ...fallback, aiAnalysisAvailable: false, analysisWarning: "AI analysis could not be completed. You can retry or continue filling the job manually." }, source: "deterministic" };
  try {
    const parsed = parse(await generate({ prompt: buildRawJobPostPrompt(text), task: "raw-job-extraction", timeoutMs: 20000 }));
    if (!parsed) throw new Error("Invalid AI JSON");
    return { data: { ...normalizeExtractedJobDataV3(parsed, fallback, { rawText: text, source: "gemini", sourceUrl: options.sourceUrl }), aiAnalysisAvailable: true, analysisWarning: null }, source: "gemini" };
  } catch { return { data: { ...fallback, aiAnalysisAvailable: false, analysisWarning: "AI analysis could not be completed. You can retry or continue filling the job manually." }, source: "deterministic" }; }
}

module.exports = { analyzeJobDescription, analyzeRawJobPost: analyzeRawJobPostV3, compatibilityFields, deterministicJdFallback, draftFromAnalysis, mergeAdminRequirements, normalizeExtractedJobData: normalizeExtractedJobDataV3, normalizeStructuredAnalysis, parse, rawJdHash };
