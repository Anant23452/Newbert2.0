const { buildSkillEvidence } = require("./skillEvidenceService");

function mean(values) { const valid = values.filter(Number.isFinite); return valid.length ? Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length) : null; }
function confidenceLabel(value) { return value >= 0.8 ? "High" : value >= 0.55 ? "Medium" : "Low"; }
function buildEvidenceReadiness(profile = {}) {
  const evidence = buildSkillEvidence(profile); const solved = Number(profile.leetcodeStats?.totalSolved); const dsaAvailable = Number.isFinite(solved);
  const dsaScore = dsaAvailable ? Math.min(100, Math.round(18 * Math.log10(solved + 1) + Math.min(25, (Number(profile.leetcodeStats?.mediumSolved) || 0) / 8) + Math.min(15, (Number(profile.leetcodeStats?.hardSolved) || 0) / 4))) : null;
  const skillsScore = mean(evidence.skills.map((item) => item.score)); const skillConfidence = evidence.skills.length ? Number((evidence.skills.reduce((sum, item) => sum + item.confidence, 0) / evidence.skills.length).toFixed(2)) : 0.2;
  const projectsScore = evidence.projects.score; const activityDays = (profile.activityCalendar || []).slice(-30).filter((day) => (Number(day.total) || Number(day.github) + Number(day.leetcode)) > 0).length;
  const dimensions = {
    dsa: { score: dsaScore, confidence: dsaAvailable ? (evidence.leetcode.topicEvidenceAvailable ? 0.9 : 0.65) : 0.1, sources: dsaAvailable ? ["leetcode"] : [] },
    projects: { score: projectsScore, confidence: projectsScore == null ? (evidence.projects.count != null ? 0.3 : 0.1) : 0.85, sources: projectsScore == null ? [] : ["github", "projects"] },
    skills: { score: skillsScore, confidence: skillConfidence, sources: [...new Set(evidence.skills.flatMap((item) => item.sources.map((source) => source.source)))] },
    activity: { score: activityDays ? Math.min(100, Math.round((activityDays / 20) * 100)) : null, confidence: profile.activityCalendar?.length ? 0.75 : 0.1, sources: profile.activityCalendar?.length ? ["github", "leetcode"] : [] },
  };
  const available = Object.values(dimensions).filter((item) => Number.isFinite(item.score)); const overallReadiness = available.length ? Math.round(available.reduce((sum, item) => sum + item.score * item.confidence, 0) / available.reduce((sum, item) => sum + item.confidence, 0)) : null;
  const confidence = available.length ? Number((available.reduce((sum, item) => sum + item.confidence, 0) / Object.keys(dimensions).length).toFixed(2)) : 0;
  return { overallReadiness, score: overallReadiness, confidence, confidenceLabel: confidenceLabel(confidence), dimensions, skillEvidence: evidence.skills, projectEvidence: evidence.projects, leetcodeEvidence: evidence.leetcode, limitations: evidence.limitations, disclaimer: "Readiness is an evidence-based estimate, not a placement guarantee." };
}
module.exports = { buildEvidenceReadiness, confidenceLabel };
