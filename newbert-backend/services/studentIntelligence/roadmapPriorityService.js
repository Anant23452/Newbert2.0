const { ROADMAP_PRIORITY_LEVELS, ROADMAP_PRIORITY_WEIGHTS } = require("../../config/roadmapPriorityConfig");
const { normalizeSkill } = require("../skillNormalizationService");

const REASON_LABELS = Object.freeze({
  CORE_ROLE_REQUIREMENT: "Core requirement in Newbert's selected-role benchmark",
  REQUIRED_TARGET_JOB: "Required by a selected target job",
  HIGH_SEVERITY_AI01_GAP: "High-severity gap in the current AI-01 analysis",
  IMPORTANT_PREREQUISITE: "Important prerequisite for later roadmap work",
  WEAK_OR_NO_EVIDENCE: "No strong current evidence supports this area",
  REQUIRED_ACROSS_MULTIPLE_JOBS: "Required across multiple selected jobs",
  PREFERRED_ONLY: "Preferred, but not required, in a selected job",
});

function text(value) { return String(value || "").trim(); }
function list(value) { return Array.isArray(value) ? value : []; }
function categoryFor(value) {
  const category = text(value).toLowerCase();
  if (["fundamentals", "cs-fundamental"].includes(category)) return "foundations";
  if (category === "dsa") return "dsa-interview";
  if (category === "projects") return "project-evidence";
  if (category === "activity") return "application-readiness";
  return "core-skills";
}
function evidenceItem(source, detail, supported = false, extra = {}) { return { source, detail: text(detail) || null, supported, ...extra }; }

function buildPrioritizedGaps({ ai01, jobContexts = [] }) {
  const candidates = new Map();
  const get = (label, category) => {
    const canonical = normalizeSkill(label);
    if (!canonical) return null;
    if (!candidates.has(canonical)) candidates.set(canonical, { id: `gap-${canonical.replace(/[^a-z0-9]+/g, "-")}`, item: text(label), canonicalSkill: canonical, category: categoryFor(category), reasonCodes: new Set(), evidence: [], gapIds: new Set(), requiredJobs: new Map(), preferredJobs: new Map() });
    return candidates.get(canonical);
  };

  for (const gap of list(ai01?.gaps)) {
    const candidate = get(gap.item, gap.category);
    if (!candidate) continue;
    candidate.gapIds.add(`ai01:${normalizeSkill(gap.item)}`);
    candidate.evidence.push(evidenceItem("ai01", gap.evidence, false));
    if (["skills", "fundamentals"].includes(gap.category)) candidate.reasonCodes.add("CORE_ROLE_REQUIREMENT");
    if (gap.severity === "high") candidate.reasonCodes.add("HIGH_SEVERITY_AI01_GAP");
    if (["fundamentals", "dsa"].includes(gap.category)) candidate.reasonCodes.add("IMPORTANT_PREREQUISITE");
    candidate.reasonCodes.add("WEAK_OR_NO_EVIDENCE");
  }

  for (const context of jobContexts) {
    const jobId = String(context.job?._id || context.job?.id || "");
    const jobLabel = [context.job?.company, context.job?.title].filter(Boolean).join(" · ");
    const requirements = new Map(list(context.job?.jdAnalysis?.requirements).map((item) => [item.id, item]));
    for (const match of list(context.match?.requirementMatches)) {
      if (match.status === "matched") continue;
      const requirement = requirements.get(match.requirementId) || { label: match.skill, canonicalSkill: match.canonicalSkill, importance: match.importance, category: "technical", evidenceText: match.jdEvidence };
      const candidate = get(requirement.label, requirement.category);
      if (!candidate) continue;
      candidate.gapIds.add(`job:${jobId}:${requirement.id || requirement.canonicalSkill}`);
      candidate.evidence.push(evidenceItem("target_job", requirement.evidenceText, Boolean(requirement.evidenceText), { jobId, job: jobLabel || null }));
      if (["critical", "required"].includes(requirement.importance)) { candidate.requiredJobs.set(jobId, jobLabel); candidate.reasonCodes.add("REQUIRED_TARGET_JOB"); }
      else candidate.preferredJobs.set(jobId, jobLabel);
      if (requirement.category === "cs-fundamental") candidate.reasonCodes.add("IMPORTANT_PREREQUISITE");
      if (["missing", "unknown", "partial"].includes(match.status)) candidate.reasonCodes.add("WEAK_OR_NO_EVIDENCE");
    }
  }

  return [...candidates.values()].map((candidate) => {
    if (candidate.requiredJobs.size >= 2) candidate.reasonCodes.add("REQUIRED_ACROSS_MULTIPLE_JOBS");
    if (!candidate.requiredJobs.size && candidate.preferredJobs.size) candidate.reasonCodes.add("PREFERRED_ONLY");
    const reasonCodes = [...candidate.reasonCodes];
    const priorityScore = reasonCodes.reduce((sum, code) => sum + (ROADMAP_PRIORITY_WEIGHTS[code] || 0), 0);
    const priority = priorityScore >= ROADMAP_PRIORITY_LEVELS.high ? "high" : priorityScore >= ROADMAP_PRIORITY_LEVELS.medium ? "medium" : "low";
    return { id: candidate.id, item: candidate.item, canonicalSkill: candidate.canonicalSkill, category: candidate.category, priorityScore, priority, reasonCodes, reasons: reasonCodes.map((code) => REASON_LABELS[code]), evidence: candidate.evidence, gapIds: [...candidate.gapIds], relatedJobs: [...new Set([...candidate.requiredJobs.values(), ...candidate.preferredJobs.values()].filter(Boolean))], jobFrequency: { required: candidate.requiredJobs.size, preferred: candidate.preferredJobs.size, selected: jobContexts.length } };
  }).sort((left, right) => right.priorityScore - left.priorityScore || left.item.localeCompare(right.item));
}

module.exports = { REASON_LABELS, buildPrioritizedGaps };
