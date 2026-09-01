const { SKILL_SIGNALS, UTILITY_PACKAGES } = require("../config/skillSignals");
const {
  normalizeSkill,
  skillLabel,
  getSkillCategory,
  getSkillTargetRelevance,
  isCareerSkill,
} = require("./skillNormalizationService");
const { normalizeProjectEvidence } = require("./projectEvidenceService");
const { buildLeetcodeTopicEvidence } = require("./leetcodeTopicService");

const LEVELS = ["claimed", "detected", "used", "demonstrated", "strong_evidence"];

function clamp(value) { return Math.max(0, Math.min(100, Math.round(value))); }

function levelFor(score) {
  return score >= 85 ? LEVELS[4] : score >= 65 ? LEVELS[3] : score >= 45 ? LEVELS[2] : score >= 25 ? LEVELS[1] : LEVELS[0];
}

function add(map, skill, points, source) {
  const key = normalizeSkill(skill);
  if (!key || !isCareerSkill(key) || !isCareerSkill(skill)) return;
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
    if (item.name && isCareerSkill(item.name)) {
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
    const detected = new Set((repo.detectedSkills || []).filter(isCareerSkill));
    const used = new Set((repo.usedSkills || []).filter(isCareerSkill));
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
        if (!isCareerSkill(tech.name) || !isCareerSkill(tech.canonical)) continue;
        const isVerified = tech.level === "VERIFIED_PROJECT_USAGE";
        const isConfirmed = tech.level === "STUDENT_CONFIRMED";
        const points = isVerified ? (isDeployed ? 40 : 30) : isConfirmed ? 25 : 15;
        add(map, tech.canonical || tech.name, points, {
          source: "project",
          type: isVerified ? "verified_project_usage" : isConfirmed ? "student_confirmed" : "detected_in_project",
          project: project.name || project.title,
          projectId: project.id,
          repositoryName: project.repositoryName || project.name,
          evidence: tech.reason || `${tech.name} ${isVerified ? "verified in code" : isConfirmed ? "detected & confirmed" : "detected in manifest"} of project ${project.name}`,
          weight: isVerified ? 0.35 : isConfirmed ? 0.25 : 0.15,
          label: tech.name,
        });
      }
    } else {
      // Fallback to confirmed/general technologies
      for (const skill of project.technologies) {
        if (!isCareerSkill(skill)) continue;
        const points = isGithub ? (isDeployed ? 35 : 25) : 15;
        add(map, skill, points, {
          source: "project",
          type: isDeployed ? "deployed_usage" : "project_technology",
          project: project.name || project.title,
          projectId: project.id,
          repositoryName: project.repositoryName || project.name,
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
      Math.min(85, 25 + Math.log2(Number(profile.leetcodeStats.totalSolved) + 1) * 7),
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

/**
 * Builds the comprehensive Effective Skill Inventory for a student.
 * Aggregates Manual + Project Evidence + LeetCode + Synced Stats.
 * Separates Skill, Category, Evidence Strength, Proficiency, Target Relevance, and Sources Provenance.
 */
function buildEffectiveSkillInventory(profile = {}, options = {}) {
  const targetRole = options.targetRole || profile.targetRole || "software engineer";
  const skillEvidenceResult = buildSkillEvidence(profile);
  const rawSkills = skillEvidenceResult.skills || [];

  const effectiveSkills = rawSkills.map((item) => {
    const canonical = item.normalizedSkill;
    const category = getSkillCategory(canonical);
    const targetRelevance = getSkillTargetRelevance(canonical, targetRole);

    // Analyze sources
    const projectSources = item.sources.filter((s) => s.source === "project");
    const verifiedProjectSources = projectSources.filter((s) => s.type === "verified_project_usage" || s.type === "deployed_usage");
    const confirmedProjectSources = projectSources.filter((s) => s.type === "student_confirmed");
    const detectedProjectSources = projectSources.filter((s) => s.type === "detected_in_project");
    const manualSources = item.sources.filter((s) => s.source === "profile" || s.type === "claimed");
    const leetcodeSources = item.sources.filter((s) => s.source === "leetcode");

    const projectCount = new Set(projectSources.map((s) => s.project || s.repositoryName).filter(Boolean)).size;
    const verifiedProjectCount = new Set(verifiedProjectSources.map((s) => s.project || s.repositoryName).filter(Boolean)).size;

    let evidenceStrength = "UNKNOWN";
    let evidenceLabel = "Unknown";
    let summary = "No verified evidence";

    if (verifiedProjectCount >= 2) {
      evidenceStrength = "STRONG_REPEATED_PROJECT_USAGE";
      evidenceLabel = "Strong repeated project evidence";
      summary = `Verified across ${verifiedProjectCount} projects`;
    } else if (verifiedProjectCount === 1) {
      evidenceStrength = "VERIFIED_PROJECT_USAGE";
      evidenceLabel = "Verified project evidence";
      const pName = verifiedProjectSources[0]?.project || "project";
      summary = `Verified in ${pName}`;
    } else if (confirmedProjectSources.length > 0) {
      evidenceStrength = "STUDENT_CONFIRMED";
      evidenceLabel = "Detected & confirmed by student";
      summary = `Detected in configuration and confirmed by student`;
    } else if (detectedProjectSources.length > 0) {
      evidenceStrength = "DETECTED";
      evidenceLabel = "Detected";
      summary = `Found in configuration, usage not yet fully verified`;
    } else if (leetcodeSources.length > 0) {
      evidenceStrength = "VERIFIED_ASSESSMENT";
      evidenceLabel = "Verified coding signal";
      summary = `${profile.leetcodeStats?.totalSolved || 0} LeetCode problems solved`;
    } else if (manualSources.length > 0) {
      evidenceStrength = "SELF_REPORTED";
      evidenceLabel = "Self-reported";
      summary = "Claimed in student profile";
    }

    // Proficiency rule: GitHub usage proves experience/evidence, NOT formal mastery
    let proficiency = "UNKNOWN";
    if (leetcodeSources.length > 0 && (profile.leetcodeStats?.totalSolved || 0) >= 150) {
      proficiency = "STRONG";
    } else if (verifiedProjectCount >= 2 || (verifiedProjectCount >= 1 && item.score >= 50)) {
      proficiency = "DEVELOPING";
    } else if (manualSources.length > 0 || detectedProjectSources.length > 0) {
      proficiency = "UNVERIFIED";
    }

    const structuredSources = item.sources.map((s) => ({
      source: s.source,
      type: s.type,
      project: s.project || s.repository || null,
      projectId: s.projectId || null,
      repositoryName: s.repositoryName || null,
      evidence: s.evidence || null,
      weight: s.weight || 0,
      label: s.label || item.skill,
    }));

    return {
      skill: item.skill,
      canonical,
      category,
      score: item.score,
      level: item.level,
      confidence: item.confidence,
      evidenceStrength,
      evidenceLabel,
      summary,
      proficiency,
      targetRelevance,
      projectCount,
      verifiedProjectCount,
      hasManualClaim: manualSources.length > 0,
      hasProjectEvidence: projectSources.length > 0,
      hasLeetcodeEvidence: leetcodeSources.length > 0,
      sources: structuredSources,
    };
  });

  // Group by categories
  const categories = {
    languages: effectiveSkills.filter((s) => s.category === "languages"),
    frameworks: effectiveSkills.filter((s) => s.category === "frameworks"),
    databases: effectiveSkills.filter((s) => s.category === "databases"),
    tools: effectiveSkills.filter((s) => s.category === "tools"),
    ui_tooling: effectiveSkills.filter((s) => s.category === "ui_tooling"),
    fundamentals: effectiveSkills.filter((s) => s.category === "fundamentals"),
  };

  return {
    effectiveSkills,
    categories,
    targetRole,
    totalSkills: effectiveSkills.length,
    verifiedCount: effectiveSkills.filter((s) => ["VERIFIED_PROJECT_USAGE", "STRONG_REPEATED_PROJECT_USAGE", "VERIFIED_ASSESSMENT"].includes(s.evidenceStrength)).length,
    detectedCount: effectiveSkills.filter((s) => s.evidenceStrength === "DETECTED" || s.evidenceStrength === "STUDENT_CONFIRMED").length,
    manualOnlyCount: effectiveSkills.filter((s) => s.evidenceStrength === "SELF_REPORTED").length,
    generatedAt: new Date().toISOString(),
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
    if (!isCareerSkill(signal.label) || !isCareerSkill(key)) continue;
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
  buildEffectiveSkillInventory,
  buildSkillEvidence,
  levelFor,
};
