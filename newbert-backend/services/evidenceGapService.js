const { IMPORTANCE_WEIGHT } = require("./jobRequirementEvidenceService");

function severity(gap) { return gap >= 50 ? "high" : gap >= 25 ? "medium" : gap > 5 ? "low" : "none"; }
function compareEvidence(requirements = [], evidence = {}) {
  const bySkill = new Map((evidence.skills || []).map((item) => [item.normalizedSkill, item]));
  return requirements.map((requirement) => {
    const student = bySkill.get(requirement.normalizedSkill); const evidenceScore = student?.score ?? 0;
    const requirementWeight = Math.round((IMPORTANCE_WEIGHT[requirement.importance] || 60) * requirement.confidence);
    const gapScore = Math.max(0, requirementWeight - evidenceScore);
    return { skill: requirement.skill, normalizedSkill: requirement.normalizedSkill, requirement: { source: requirement.source, sourceLabel: requirement.sourceLabel, confidence: requirement.confidence, importance: requirement.importance, weight: requirementWeight, evidenceText: requirement.evidenceText }, student: { evidenceScore, level: student?.level || "claimed", confidence: student?.confidence || 0.2, sources: student?.sources || [] }, gapScore, severity: severity(gapScore) };
  });
}

const NEEDS = Object.freeze({ react: ["API integration", "loading and error states", "state management"], git: ["branching workflow", "pull request evidence"], "rest-api": ["request handling", "validation", "error responses"], default: ["reviewable implementation", "documented decisions", "working result"] });
function generateEvidenceTasks(gaps = []) {
  const priority = { critical: 4, required: 3, preferred: 2, baseline: 1, optional: 0 };
  return gaps.filter((gap) => gap.gapScore > 5).sort((a, b) => (priority[b.requirement.importance] - priority[a.requirement.importance]) || b.gapScore - a.gapScore || b.requirement.confidence - a.requirement.confidence).slice(0, 7).map((gap) => {
    const category = gap.requirement.source === "role_baseline" ? "role_baseline" : gap.requirement.source === "explicit" && gap.gapScore >= 25 ? "critical" : "recommended";
    const evidenceNeeded = NEEDS[gap.normalizedSkill] || NEEDS.default;
    return { id: `evidence-${gap.normalizedSkill}-${category}`, title: category === "role_baseline" ? `Strengthen ${gap.skill} foundations` : `Build reviewable ${gap.skill} evidence`, category, skill: gap.skill, reason: gap.requirement.source === "explicit" ? `${gap.skill} is explicitly required by this job and current evidence is ${gap.student.level}.` : gap.requirement.source === "role_baseline" ? `${gap.skill} is a recommended role baseline, not a stated company requirement.` : `${gap.skill} is ${gap.requirement.source === "inferred" ? "strongly inferred" : "admin verified"} and available evidence is limited.`, requirementSource: gap.requirement.source, requirementConfidence: gap.requirement.confidence, currentEvidenceLevel: gap.student.level, currentEvidenceScore: gap.student.evidenceScore, targetScore: gap.requirement.weight, evidenceNeeded, estimatedTime: gap.gapScore >= 50 ? "3-5 days" : "1-3 days" };
  });
}
module.exports = { compareEvidence, generateEvidenceTasks, severity };
