const { SKILL_SIGNALS } = require("../config/skillSignals");
const { normalizeSkill, skillLabel } = require("./skillNormalizationService");
const { normalizeProjectEvidence } = require("./projectEvidenceService");
const { buildLeetcodeTopicEvidence } = require("./leetcodeTopicService");

const LEVELS = ["claimed", "detected", "used", "demonstrated", "strong_evidence"];

function clamp(value) { return Math.max(0, Math.min(100, Math.round(value))); }

function levelFor(score) {
  return score >= 85 ? LEVELS[4] : score >= 65 ? LEVELS[3] : score >= 45 ? LEVELS[2] : score >= 25 ? LEVELS[1] : LEVELS[0];
}

function add(map, skill, points, source) {
  const key = normalizeSkill(skill);
  if (!key) return;
  const current = map.get(key) || {
    skill: skillLabel(key) || source.label || skill,
    normalizedSkill: key,
    score: 0,
    sources: [],
  };
  current.score = clamp(current.score + points);
  current.sources.push(source);
  map.set(key, current);
}

function buildSkillEvidence(profile = {}) {
  const map = new Map();

  // 1. Profile claimed skills
  for (const value of profile.skills || []) {
    const item = typeof value === "string" ? { name: value } : value;
    if (item.name) {
      add(map, item.name, 15, {
        source: "profile",
        type: "claimed",
        evidence: "Skill listed in student profile",
        weight: 0.15,
        label: item.name,
      });
    }
  }

  // 2. Synced GitHub repository language and scan signals
  const repositories = profile.githubStats?.repositories || [];
  for (const repo of repositories) {
    const detected = new Set(repo.detectedSkills || []);
    const used = new Set(repo.usedSkills || []);
    for (const skill of detected) {
      add(map, skill, 30, {
        source: "github",
        type: "dependency",
        repository: repo.name,
        evidence: `${skill} detected in repository manifest/files`,
        weight: 0.25,
      });
    }
    for (const skill of used) {
      add(map, skill, 25, {
        source: "github",
        type: "usage",
        repository: repo.name,
        evidence: `${skill} implementation signals verified in code`,
        weight: 0.3,
      });
    }
  }

  // 3. Structured Projects (from GitHub Project Intelligence & manual entries)
  const projectEvidence = normalizeProjectEvidence(profile);
  for (const project of projectEvidence.structured) {
    const isDeployed = project.evidence?.hasDeployment;
    const isGithub = project.source === "github";
    
    // Check detected technologies with distinct confidence weights
    if (Array.isArray(project.detectedTechnologies) && project.detectedTechnologies.length) {
      for (const tech of project.detectedTechnologies) {
        const isVerified = tech.level === "VERIFIED_PROJECT_USAGE";
        const points = isVerified ? (isDeployed ? 40 : 30) : 20;
        add(map, tech.canonical || tech.name, points, {
          source: "project",
          type: isVerified ? "verified_project_usage" : "detected_in_project",
          project: project.name,
          evidence: tech.reason || `${tech.name} ${isVerified ? "verified in code" : "detected in manifest"} of project ${project.name}`,
          weight: isVerified ? 0.35 : 0.2,
          label: tech.name,
        });
      }
    } else {
      // Fallback to confirmed/general technologies
      for (const skill of project.technologies) {
        const points = isGithub ? (isDeployed ? 35 : 25) : 15;
        add(map, skill, points, {
          source: "project",
          type: isDeployed ? "deployed_usage" : "project_technology",
          project: project.name,
          evidence: `${skill} used in ${isDeployed ? "deployed " : ""}${isGithub ? "GitHub " : ""}project (${project.name})`,
          weight: isDeployed ? 0.3 : 0.2,
        });
      }
    }
  }

  // 4. Synced LeetCode Topic Evidence
  const leetcodeTopics = buildLeetcodeTopicEvidence(profile.leetcodeStats || {});
  if (Number(profile.leetcodeStats?.totalSolved) > 0) {
    add(
      map,
      "DSA",
      Math.min(80, 25 + Math.log2(Number(profile.leetcodeStats.totalSolved) + 1) * 7),
      {
        source: "leetcode",
        type: "overall_solved",
        evidence: `${profile.leetcodeStats.totalSolved} LeetCode problems solved`,
        weight: 0.5,
      }
    );
  }

  // Final skill score, level, and confidence calculation
  const skills = [...map.values()]
    .map((item) => ({
      ...item,
      score: clamp(item.score),
      level: levelFor(item.score),
      confidence: Math.min(0.95, Number((0.2 + item.sources.reduce((sum, s) => sum + Number(s.weight || 0), 0)).toFixed(2))),
    }))
    .sort((a, b) => b.score - a.score);

  return {
    skills,
    projects: projectEvidence,
    leetcode: leetcodeTopics,
    generatedAt: new Date().toISOString(),
    limitations: [
      projectEvidence.limitation,
      !leetcodeTopics.topicEvidenceAvailable ? "Your total solved count is available, but topic-level analysis is not currently available." : null,
    ].filter(Boolean),
  };
}

function analyzeRepositorySnapshot(snapshot = {}) {
  const dependencies = new Set(
    Object.keys({ ...(snapshot.dependencies || {}), ...(snapshot.devDependencies || {}) }).map((item) => item.toLowerCase())
  );
  const files = snapshot.files || [];
  const content = String(snapshot.content || "");
  const detectedSkills = [];
  const usedSkills = [];

  for (const [key, signal] of Object.entries(SKILL_SIGNALS)) {
    if (
      (signal.dependencies || []).some((dep) => dependencies.has(dep)) ||
      (signal.extensions || []).some((ext) => files.some((file) => file.toLowerCase().endsWith(ext)))
    ) {
      detectedSkills.push(signal.label);
    }
    if (
      (signal.patterns || []).some((pattern) => content.includes(pattern)) &&
      ((signal.extensions || []).some((ext) => files.filter((file) => file.toLowerCase().endsWith(ext)).length >= 2) || files.length >= 3)
    ) {
      usedSkills.push(signal.label);
    }
  }

  return {
    detectedSkills: [...new Set(detectedSkills)],
    usedSkills: [...new Set(usedSkills)],
  };
}

module.exports = {
  LEVELS,
  analyzeRepositorySnapshot,
  buildSkillEvidence,
  levelFor,
};
