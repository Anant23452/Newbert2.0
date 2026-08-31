const { normalizeSkill } = require("./skillNormalizationService");

const WEIGHTS = Object.freeze({ repository: 10, deployment: 10, readme: 5, frontend: 10, backend: 15, database: 15, authentication: 10, apiIntegration: 10, featureDepth: 10, technologyBreadth: 5 });

function bool(value) { return value === true; }
function normalizeProject(project = {}) {
  const technologies = [...new Set((project.technologies || []).map(String).filter(Boolean))];
  const features = [...new Set((project.features || []).map(String).filter(Boolean))];
  const evidence = { ...(project.evidence || {}) };
  return {
    name: String(project.name || project.title || "Untitled project").trim(), description: project.description || null,
    repoUrl: project.repoUrl || project.repositoryUrl || null, liveUrl: project.liveUrl || project.deploymentUrl || null,
    technologies, features,
    evidence: {
      hasRepository: bool(evidence.hasRepository) || Boolean(project.repoUrl || project.repositoryUrl),
      hasDeployment: bool(evidence.hasDeployment) || Boolean(project.liveUrl || project.deploymentUrl),
      hasReadme: bool(evidence.hasReadme), hasFrontend: bool(evidence.hasFrontend), hasBackend: bool(evidence.hasBackend),
      hasDatabase: bool(evidence.hasDatabase), hasAuthentication: bool(evidence.hasAuthentication), hasApiIntegration: bool(evidence.hasApiIntegration),
    },
    complexity: ["basic", "intermediate", "advanced"].includes(project.complexity) ? project.complexity : null,
  };
}

function scoreProject(input = {}) {
  const project = normalizeProject(input); const e = project.evidence;
  let score = 0;
  score += e.hasRepository ? WEIGHTS.repository : 0; score += e.hasDeployment ? WEIGHTS.deployment : 0; score += e.hasReadme ? WEIGHTS.readme : 0;
  score += e.hasFrontend ? WEIGHTS.frontend : 0; score += e.hasBackend ? WEIGHTS.backend : 0; score += e.hasDatabase ? WEIGHTS.database : 0;
  score += e.hasAuthentication ? WEIGHTS.authentication : 0; score += e.hasApiIntegration ? WEIGHTS.apiIntegration : 0;
  score += Math.min(WEIGHTS.featureDepth, project.features.length * 2); score += Math.min(WEIGHTS.technologyBreadth, project.technologies.length);
  score = Math.max(0, Math.min(100, score));
  const evidenceCount = Object.values(e).filter(Boolean).length + project.features.length + project.technologies.length;
  return { ...project, projectScore: score, projectLevel: score >= 75 ? "strong" : score >= 45 ? "substantial" : score > 0 ? "limited" : "unverified", evidenceCount };
}

function normalizeProjectEvidence(profile = {}) {
  const projects = (profile.projectDetails || profile.projectsDetail || []).map(scoreProject);
  const legacyCount = Number.isFinite(Number(profile.projects)) ? Number(profile.projects) : null;
  const scores = projects.map((item) => item.projectScore);
  const score = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null;
  return {
    count: projects.length || legacyCount, structured: projects, score,
    level: score == null ? (legacyCount != null ? "count_only" : "unavailable") : score >= 75 ? "strong" : score >= 45 ? "substantial" : "limited",
    evidenceCount: projects.reduce((sum, project) => sum + project.evidenceCount, 0),
    technologies: [...new Set(projects.flatMap((project) => project.technologies).map(normalizeSkill).filter(Boolean))],
    limitation: !projects.length && legacyCount != null ? "Add GitHub repositories or project details to improve project evidence." : null,
  };
}

module.exports = { WEIGHTS, normalizeProject, normalizeProjectEvidence, scoreProject };
