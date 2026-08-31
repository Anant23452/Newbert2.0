const crypto = require("crypto");
const { normalizeSkill } = require("./skillNormalizationService");
const { getRoleBaseline } = require("../data/roleBaselines");

const SOURCE_LABELS = Object.freeze({ explicit: "JD requirement", inferred: "Strongly inferred", role_baseline: "Role baseline", manual: "Admin verified" });
const IMPORTANCE_WEIGHT = Object.freeze({ critical: 90, required: 80, preferred: 65, optional: 45, baseline: 55 });
function numericConfidence(value, source) { if (Number.isFinite(Number(value))) return Math.max(0, Math.min(1, Number(value))); return ({ high: 1, medium: 0.78, low: 0.55 }[value] || { explicit: 1, inferred: 0.78, role_baseline: 0.55, manual: 0.9 }[source] || 0.55); }
function sourceFor(item) { if (["explicit", "inferred", "role_baseline", "manual"].includes(item.source)) return item.source; if (item.source === "manual_override") return "manual"; return item.evidenceText ? "explicit" : "manual"; }
function normalizeRequirement(item, fallbackImportance = "required") {
  const value = typeof item === "string" ? { label: item } : (item || {}); const skill = String(value.skill || value.label || value.canonicalSkill || "").trim(); if (!skill) return null;
  const source = sourceFor(value); const normalizedSkill = normalizeSkill(skill); const importance = value.importance || fallbackImportance;
  return { ...value, id: value.id || `req-${crypto.createHash("sha1").update(`${normalizedSkill}:${source}`).digest("hex").slice(0, 10)}`, skill, label: skill, normalizedSkill, canonicalSkill: normalizedSkill, source, sourceLabel: SOURCE_LABELS[source], confidence: numericConfidence(value.confidence, source), importance, evidenceText: value.evidenceText || (source === "role_baseline" ? "Recommended role foundation; not stated by the company." : null), scoreEligible: source !== "role_baseline" ? value.scoreEligible !== false : true };
}
function normalizeJobRequirements(job = {}) {
  const structured = Array.isArray(job.jdAnalysis?.requirements) ? job.jdAnalysis.requirements : [];
  let requirements = structured.map((item) => normalizeRequirement(item)).filter(Boolean);
  if (!requirements.length) {
    const legacy = Array.isArray(job.requirements) ? job.requirements : [...(job.requirements?.requiredSkills || []), ...(job.skills || [])];
    requirements = legacy.map((item) => normalizeRequirement(typeof item === "string" ? { label: item, source: "manual", confidence: 0.8 } : item)).filter(Boolean);
  }
  const existingBeforeInference = new Set(requirements.map((item) => item.normalizedSkill));
  const inferred = [];
  if (existingBeforeInference.has(normalizeSkill("Next.js")) && !existingBeforeInference.has(normalizeSkill("React"))) inferred.push({ skill: "React", source: "inferred", confidence: 0.8, importance: "preferred", evidenceText: "React is strongly implied by the stated Next.js responsibility." });
  if (["Express", "FastAPI", "Flask"].some((skill) => existingBeforeInference.has(normalizeSkill(skill))) && !existingBeforeInference.has(normalizeSkill("REST APIs"))) inferred.push({ skill: "REST APIs", source: "inferred", confidence: 0.75, importance: "preferred", evidenceText: "API design is strongly implied by the stated backend framework." });
  requirements.push(...inferred.map((item) => normalizeRequirement(item, "preferred")));
  const explicitCount = requirements.filter((item) => item.source !== "role_baseline").length;
  if (explicitCount < 3) {
    const existing = new Set(requirements.map((item) => item.normalizedSkill));
    for (const baseline of getRoleBaseline(job.roleCategory || job.title)) { const item = normalizeRequirement(baseline, "baseline"); if (!existing.has(item.normalizedSkill)) requirements.push(item); }
  }
  const unique = new Map(); for (const item of requirements) if (!unique.has(item.normalizedSkill) || item.source !== "role_baseline") unique.set(item.normalizedSkill, item);
  return [...unique.values()];
}
module.exports = { IMPORTANCE_WEIGHT, SOURCE_LABELS, normalizeJobRequirements, normalizeRequirement, numericConfidence };
