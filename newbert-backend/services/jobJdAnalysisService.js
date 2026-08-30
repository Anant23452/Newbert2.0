const crypto = require("crypto");
const { generateAI } = require("./ai/aiService");
const { buildJobDescriptionPrompt } = require("./ai/prompts");
const { buildRawJobPostPrompt } = require("./ai/prompts");
const { DEFAULT_MODEL } = require("./ai/geminiProvider");
const { normalizeSkill, normalizeSkillList, skillLabel } = require("./skillNormalizationService");

function parse(text) { const match = String(text || "").match(/\{[\s\S]*\}/); if (!match) return null; try { return JSON.parse(match[0]); } catch { return null; } }
const IMPORTANCE = new Set(["critical", "required", "preferred", "optional"]);
const CONFIDENCE = new Set(["high", "medium", "low"]);
const IMPORTANCE_RANK = { critical: 4, required: 3, preferred: 2, optional: 1 };
const SKILL_CATALOG = ["JavaScript", "TypeScript", "React", "Node.js", "Express", "Python", "Java", "C++", "SQL", "PostgreSQL", "MySQL", "MongoDB", "Docker", "AWS", "Git", "REST APIs", "DBMS", "Operating Systems", "Computer Networks", "DSA", "Testing"];

function textList(value, limit = 30) { return Array.isArray(value) ? [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))].slice(0, limit) : []; }
function compact(value) { return String(value || "").trim().replace(/\s+/g, " "); }
function sentences(description) { return String(description || "").split(/(?<=[.!?])\s+|\r?\n+/).map(compact).filter(Boolean); }
function evidenceFor(description, skill) { const canonical = normalizeSkill(skill); return sentences(description).find((sentence) => normalizeSkillList(SKILL_CATALOG.filter((item) => sentence.toLowerCase().includes(item.toLowerCase()))).includes(canonical) || sentence.toLowerCase().includes(String(skill).toLowerCase()))?.slice(0, 300) || ""; }
function evidenceIsPresent(description, evidenceText) { const source = compact(description).toLowerCase(); const evidence = compact(evidenceText).toLowerCase(); return Boolean(evidence && source.includes(evidence)); }
function requirementId(canonicalSkill) { return `req-${crypto.createHash("sha1").update(canonicalSkill).digest("hex").slice(0, 10)}`; }

function normalizeRequirement(value, description) {
  const canonicalSkill = normalizeSkill(value?.canonicalSkill || value?.label || value);
  if (!canonicalSkill) return null;
  const proposedEvidence = compact(value?.evidenceText);
  const validEvidence = evidenceIsPresent(description, proposedEvidence) ? proposedEvidence : evidenceFor(description, value?.label || value?.canonicalSkill || value);
  const importance = IMPORTANCE.has(value?.importance) ? value.importance : "required";
  const requestedConfidence = CONFIDENCE.has(value?.confidence) ? value.confidence : validEvidence ? "medium" : "low";
  const confidence = validEvidence ? requestedConfidence : "low";
  return {
    id: requirementId(canonicalSkill),
    canonicalSkill,
    label: compact(value?.label) || skillLabel(canonicalSkill),
    category: ["technical", "fundamental", "tool", "other"].includes(value?.category) ? value.category : "technical",
    importance,
    evidenceText: validEvidence,
    confidence,
    scoreEligible: Boolean(validEvidence && confidence !== "low"),
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
function compatibilityFields(analysis) {
  const requiredSkills = analysis.requirements.filter((item) => ["critical", "required"].includes(item.importance)).map((item) => item.label);
  const preferredSkills = analysis.requirements.filter((item) => ["preferred", "optional"].includes(item.importance)).map((item) => item.label);
  const csFundamentals = analysis.requirements.filter((item) => item.category === "fundamental").map((item) => item.label);
  return { requiredSkills, preferredSkills, csFundamentals, minimumCgpa: analysis.eligibility.minimumCgpa, allowedBranches: analysis.eligibility.branches, graduationYears: analysis.eligibility.graduationYears, experienceLevel: analysis.experience?.level || "unspecified", responsibilities: analysis.responsibilities };
}

function normalizeStructuredAnalysis(value = {}, input = {}, source = "deterministic") {
  const description = String(input.description || "");
  const legacy = [
    ...textList(value.requiredSkills).map((label) => ({ label, importance: "required", category: textList(value.csFundamentals).includes(label) ? "fundamental" : "technical" })),
    ...textList(value.preferredSkills).map((label) => ({ label, importance: "preferred", category: "technical" })),
  ];
  const requirements = dedupeRequirements([...(Array.isArray(value.requirements) ? value.requirements : []), ...legacy].map((item) => normalizeRequirement(item, description)));
  const eligibilityInput = value.eligibility && typeof value.eligibility === "object" ? value.eligibility : value;
  const eligibility = {
    degrees: textList(eligibilityInput.degrees),
    branches: textList(eligibilityInput.branches || eligibilityInput.allowedBranches),
    graduationYears: cleanYears(eligibilityInput.graduationYears),
    minimumCgpa: cleanCgpa(eligibilityInput.minimumCgpa),
    locationRestrictions: textList(eligibilityInput.locationRestrictions),
    other: textList(eligibilityInput.other),
  };
  const experience = value.experience && typeof value.experience === "object" ? value.experience : { level: ["intern", "entry-level", "junior", "mid", "senior"].includes(value.experienceLevel) ? value.experienceLevel : "unspecified" };
  const analysis = {
    role: compact(value.role || input.title) || null,
    eligibility,
    requirements,
    experience,
    responsibilities: textList(value.responsibilities, 20),
    metadata: {
      extractionMethod: source,
      model: source === "gemini" ? process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL : null,
      analyzedAt: new Date().toISOString(),
      schemaVersion: "2.0",
    },
  };
  return { ...analysis, ...compatibilityFields(analysis) };
}

function explicitImportance(sentence) {
  if (/\b(optional|optionally)\b/i.test(sentence)) return "optional";
  if (/\b(preferred|nice to have|good to have|bonus|plus)\b/i.test(sentence)) return "preferred";
  if (/\b(mandatory|critical|essential)\b/i.test(sentence)) return "critical";
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
  const branchMatches = description.match(/\b(CSE|Computer Science|Information Technology|ECE|Electrical Engineering|Mechanical Engineering|Civil Engineering)\b/gi) || [];
  return normalizeStructuredAnalysis({ role: input.title, eligibility: { degrees: degreeMatches, branches: branchMatches, graduationYears: years, minimumCgpa: cgpaMatch ? Number(cgpaMatch[1] || cgpaMatch[2]) : null }, requirements, experience: {}, responsibilities: [] }, input, "deterministic");
}

function mergeAdminRequirements(baseAnalysis, overrides, input) {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) return baseAnalysis;
  const replacements = [];
  if (Array.isArray(overrides.requiredSkills)) replacements.push(...overrides.requiredSkills.map((label) => ({ label, importance: "required", category: "technical" })));
  if (Array.isArray(overrides.preferredSkills)) replacements.push(...overrides.preferredSkills.map((label) => ({ label, importance: "preferred", category: "technical" })));
  if (Array.isArray(overrides.csFundamentals)) replacements.push(...overrides.csFundamentals.map((label) => ({ label, importance: "required", category: "fundamental" })));
  const hasRequirementOverride = ["requiredSkills", "preferredSkills", "csFundamentals"].some((key) => Array.isArray(overrides[key]));
  const value = {
    ...baseAnalysis,
    requirements: hasRequirementOverride ? replacements : baseAnalysis.requirements,
    eligibility: {
      ...baseAnalysis.eligibility,
      ...(Object.hasOwn(overrides, "allowedBranches") ? { branches: overrides.allowedBranches } : {}),
      ...(Object.hasOwn(overrides, "graduationYears") ? { graduationYears: overrides.graduationYears } : {}),
      ...(Object.hasOwn(overrides, "minimumCgpa") ? { minimumCgpa: overrides.minimumCgpa } : {}),
    },
    responsibilities: Array.isArray(overrides.responsibilities) ? overrides.responsibilities : baseAnalysis.responsibilities,
  };
  const merged = normalizeStructuredAnalysis(value, input, hasRequirementOverride ? "admin_override" : baseAnalysis.metadata?.extractionMethod || "deterministic");
  return merged;
}

async function analyzeJobDescription(input) {
  const safeFallback = deterministicJdFallback(input);
  if (!process.env.GEMINI_API_KEY) return { analysis: safeFallback, source: "deterministic" };
  try {
    const text = await generateAI({ prompt: buildJobDescriptionPrompt(input), task: "job-jd-analysis", timeoutMs: 15000 });
    const parsed = parse(text);
    if (!parsed) return { analysis: safeFallback, source: "deterministic" };
    return { analysis: normalizeStructuredAnalysis(parsed, input, "gemini"), source: "gemini" };
  } catch { return { analysis: safeFallback, source: "deterministic" }; }
}
function urls(text) { return [...String(text || "").matchAll(/https?:\/\/[^\s<>"']+/gi)].map((match) => match[0].replace(/[),.;]+$/, "")); }
function rawFallback(rawText) { const text = String(rawText || "").slice(0, 20000); const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean); const allUrls = urls(text); const linkedIn = allUrls.find((url) => /linkedin\.com\/jobs\/view\//i.test(url)); const jobId = linkedIn?.match(/jobs\/view\/(\d+)/i)?.[1] || null; const canonicalLinkedIn = jobId ? `https://www.linkedin.com/jobs/view/${jobId}/` : linkedIn || null; const official = allUrls.find((url) => !/linkedin\.com/i.test(url) && /(apply|career|job|greenhouse|lever|ashby|workday)/i.test(url)) || null; const title = lines.find((line) => /\b(developer|engineer|designer|analyst|intern|manager)\b/i.test(line)) || null; const company = title ? lines[Math.max(0, lines.indexOf(title) - 1)] || null : null; const location = lines.find((line) => /india|remote|hybrid|on-site|onsite/i.test(line) && line.length < 100) || null; const employmentType = /full[ -]?time/i.test(text) ? "full-time" : /internship|intern\b/i.test(text) ? "internship" : null; const workMode = /on[ -]?site/i.test(text) ? "on-site" : /hybrid/i.test(text) ? "hybrid" : /remote/i.test(text) ? "remote" : null; const education = [...new Set((text.match(/\b(B\.?Tech|BCA|MCA|BE|B\.?Sc)\b/gi) || []).map((item) => item.replace(/\./g, "")))]; const skills = ["html", "css", "javascript", "typescript", "react", "node.js", "sql", "figma", "responsive design", "ui/ux design", "frontend frameworks"].filter((skill) => text.toLowerCase().includes(skill)); const phone = text.match(/(?:whatsapp|phone)\s*[:\-]?\s*(\+?\d[\d\s-]{7,})/i)?.[1]?.replace(/\D/g, "") || null; return { title, company, location: { city: location?.split(",")[0] || null, state: location?.split(",")[1]?.trim() || null, country: /india/i.test(location || "") ? "India" : null, raw: location }, workMode, employmentType, experienceLevel: null, education, requiredSkills: [], preferredSkills: [], generalSkills: skills, csFundamentals: [], responsibilities: [], summary: null, salary: null, deadline: null, postedText: text.match(/\b\d+\s+days?\s+ago\b/i)?.[0] || null, applicantText: text.match(/\b(?:over\s+)?\d+\+?\s+applicants?\b/i)?.[0] || null, hiringActivity: /actively reviewing applicants/i.test(text) ? "Actively reviewing applicants" : null, officialApplyUrl: official, contact: { email: text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] || null, phone: null, whatsapp: phone }, source: { detectedProvider: linkedIn ? "linkedin" : official ? "company-careers" : /whatsapp/i.test(text) ? "whatsapp" : "unknown", linkedinJobId: jobId, linkedinJobUrl: canonicalLinkedIn, sourceUrl: canonicalLinkedIn || official || allUrls[0] || null } }; }
function normalizeExtractedJobData(value, fallbackValue) { const data = { ...fallbackValue, ...(value || {}) }; const rawLocation = String(data.location?.raw || data.location || ""); const hasMetadata = /[·|]/.test(rawLocation); const pieces = rawLocation.split(/\s*[·|]\s*/); const geographic = pieces.shift()?.trim() || null; const metadata = pieces.join(" · "); const posted = data.postedText || metadata.match(/\b\d+\s+(?:minutes?|hours?|days?|weeks?|months?)\s+ago\b/i)?.[0] || null; const applicants = data.applicantText || metadata.match(/\b(?:over\s+)?\d+[+,]?\s+(?:people\s+clicked|applicants?)\b/i)?.[0] || null; const hiring = data.hiringActivity || metadata.match(/actively reviewing applicants|promoted by hirer/i)?.[0] || null; const parts = geographic?.split(",").map((part) => part.trim()).filter(Boolean) || []; return { ...data, location: { city: hasMetadata ? parts[0] || null : data.location?.city || parts[0] || null, state: hasMetadata ? (parts.length > 2 ? parts[1] : null) : data.location?.state || (parts.length > 2 ? parts[1] : null), country: hasMetadata ? parts.find((part) => /^india$/i.test(part)) || null : data.location?.country || parts.find((part) => /^india$/i.test(part)) || null, raw: geographic }, postedText: posted, applicantText: applicants, hiringActivity: hiring, requiredSkills: normalizeSkillList(data.requiredSkills), preferredSkills: normalizeSkillList(data.preferredSkills), generalSkills: normalizeSkillList(data.generalSkills), csFundamentals: normalizeSkillList(data.csFundamentals), education: Array.isArray(data.education) ? data.education.map(String).filter(Boolean) : [], responsibilities: Array.isArray(data.responsibilities) ? data.responsibilities.map(String).filter(Boolean).slice(0, 20) : [], source: { ...fallbackValue.source, ...(data.source || {}) }, contact: { ...fallbackValue.contact, ...(data.contact || {}) } }; }
const cleanRaw = normalizeExtractedJobData;
async function analyzeRawJobPost(rawText) { const fallbackValue = rawFallback(rawText); if (!process.env.GEMINI_API_KEY) return { data: normalizeExtractedJobData(fallbackValue, fallbackValue), source: "deterministic" }; try { const text = await generateAI({ prompt: buildRawJobPostPrompt(String(rawText).slice(0, 20000)), task: "raw-job-extraction", timeoutMs: 20000 }); return { data: cleanRaw(parse(text), fallbackValue), source: parse(text) ? "gemini" : "deterministic" }; } catch { return { data: normalizeExtractedJobData(fallbackValue, fallbackValue), source: "deterministic" }; } }
module.exports = { analyzeJobDescription, analyzeRawJobPost, compatibilityFields, deterministicJdFallback, mergeAdminRequirements, normalizeExtractedJobData, normalizeStructuredAnalysis };
