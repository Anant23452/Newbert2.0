const { SKILL_SIGNALS } = require("../config/skillSignals");
const { normalizeSkill } = require("./skillNormalizationService");
const { normalizeProjectEvidence } = require("./projectEvidenceService");
const { buildLeetcodeTopicEvidence } = require("./leetcodeTopicService");

const LEVELS = ["claimed", "detected", "used", "demonstrated", "strong_evidence"];
function clamp(value) { return Math.max(0, Math.min(100, Math.round(value))); }
function levelFor(score) { return score >= 85 ? LEVELS[4] : score >= 65 ? LEVELS[3] : score >= 45 ? LEVELS[2] : score >= 25 ? LEVELS[1] : LEVELS[0]; }
function add(map, skill, points, source) { const key = normalizeSkill(skill); if (!key) return; const current = map.get(key) || { skill: source.label || skill, normalizedSkill: key, score: 0, sources: [] }; current.score = clamp(current.score + points); current.sources.push(source); map.set(key, current); }

function buildSkillEvidence(profile = {}) {
  const map = new Map();
  for (const value of profile.skills || []) { const item = typeof value === "string" ? { name: value } : value; if (item.name) add(map, item.name, 15, { source: "profile", type: "claimed", evidence: "Skill listed by student", weight: 0.15, label: item.name }); }
  const repositories = profile.githubStats?.repositories || [];
  for (const repo of repositories) {
    const detected = new Set(repo.detectedSkills || []); const used = new Set(repo.usedSkills || []);
    for (const skill of detected) add(map, skill, 30, { source: "github", type: "dependency", repository: repo.name, evidence: `${skill} detected in repository manifest or files`, weight: 0.2 });
    for (const skill of used) add(map, skill, 25, { source: "github", type: "usage", repository: repo.name, evidence: `${skill} implementation signals detected`, weight: 0.25 });
  }
  const projectEvidence = normalizeProjectEvidence(profile);
  for (const project of projectEvidence.structured) for (const skill of project.technologies) add(map, skill, project.evidence.hasDeployment ? 25 : 15, { source: "project", type: project.evidence.hasDeployment ? "deployed_usage" : "declared_technology", project: project.name, evidence: `${skill} used in ${project.evidence.hasDeployment ? "deployed " : ""}project`, weight: project.evidence.hasDeployment ? 0.25 : 0.15 });
  const leetcodeTopics = buildLeetcodeTopicEvidence(profile.leetcodeStats || {});
  if (Number(profile.leetcodeStats?.totalSolved) > 0) add(map, "DSA", Math.min(75, 20 + Math.log2(Number(profile.leetcodeStats.totalSolved) + 1) * 7), { source: "leetcode", type: "overall_solved", evidence: `${profile.leetcodeStats.totalSolved} problems solved`, weight: 0.5 });
  const skills = [...map.values()].map((item) => ({ ...item, score: clamp(item.score), level: levelFor(item.score), confidence: Math.min(0.95, Number((0.2 + item.sources.reduce((sum, source) => sum + Number(source.weight || 0), 0)).toFixed(2))) })).sort((a, b) => b.score - a.score);
  return { skills, projects: projectEvidence, leetcode: leetcodeTopics, generatedAt: new Date().toISOString(), limitations: [projectEvidence.limitation, !leetcodeTopics.topicEvidenceAvailable ? "Your total solved count is available, but topic-level analysis is not currently available." : null].filter(Boolean) };
}

function analyzeRepositorySnapshot(snapshot = {}) {
  const dependencies = new Set(Object.keys({ ...(snapshot.dependencies || {}), ...(snapshot.devDependencies || {}) }).map((item) => item.toLowerCase()));
  const files = snapshot.files || []; const content = String(snapshot.content || ""); const detectedSkills = []; const usedSkills = [];
  for (const [key, signal] of Object.entries(SKILL_SIGNALS)) {
    if ((signal.dependencies || []).some((dep) => dependencies.has(dep)) || (signal.extensions || []).some((ext) => files.some((file) => file.toLowerCase().endsWith(ext)))) detectedSkills.push(signal.label);
    if ((signal.patterns || []).some((pattern) => content.includes(pattern)) && ((signal.extensions || []).some((ext) => files.filter((file) => file.toLowerCase().endsWith(ext)).length >= 2) || files.length >= 3)) usedSkills.push(signal.label);
  }
  return { detectedSkills: [...new Set(detectedSkills)], usedSkills: [...new Set(usedSkills)] };
}

module.exports = { LEVELS, analyzeRepositorySnapshot, buildSkillEvidence, levelFor };
