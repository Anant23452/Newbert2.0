const { normalizeSkill, skillLabel } = require("./skillNormalizationService");

const WEIGHTS = Object.freeze({
  repository: 10,
  deployment: 10,
  readme: 5,
  frontend: 10,
  backend: 15,
  database: 15,
  authentication: 10,
  apiIntegration: 10,
  docker: 5,
  cicd: 5,
  featureDepth: 10,
  technologyBreadth: 5,
});

function bool(value) { return value === true; }

function normalizeProject(project = {}) {
  const confirmed = Array.isArray(project.confirmedTechnologies) && project.confirmedTechnologies.length
    ? project.confirmedTechnologies
    : project.technologies || [];
  const technologies = [...new Set(confirmed.map(String).filter(Boolean))];
  const features = [...new Set((project.features || []).map(String).filter(Boolean))];
  const evidence = { ...(project.evidence || {}) };
  const detected = Array.isArray(project.detectedTechnologies) ? project.detectedTechnologies : [];

  return {
    id: project.id || project._id || project.repositoryName || `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: String(project.name || project.title || "Untitled project").trim(),
    title: String(project.title || project.name || "Untitled project").trim(),
    description: project.description || null,
    repoUrl: project.repoUrl || project.repositoryUrl || project.url || null,
    liveUrl: project.liveUrl || project.deploymentUrl || project.homepage || null,
    repositoryFullName: project.repositoryFullName || null,
    repositoryName: project.repositoryName || null,
    primaryLanguage: project.primaryLanguage || null,
    technologies,
    confirmedTechnologies: technologies,
    detectedTechnologies: detected,
    features,
    evidence: {
      hasRepository: bool(evidence.hasRepository) || Boolean(project.repoUrl || project.repositoryUrl),
      hasDeployment: bool(evidence.hasDeployment) || Boolean(project.liveUrl || project.deploymentUrl),
      hasReadme: bool(evidence.hasReadme),
      hasFrontend: bool(evidence.hasFrontend),
      hasBackend: bool(evidence.hasBackend),
      hasDatabase: bool(evidence.hasDatabase),
      hasAuthentication: bool(evidence.hasAuthentication),
      hasApiIntegration: bool(evidence.hasApiIntegration),
      hasDocker: bool(evidence.hasDocker),
      hasCiCd: bool(evidence.hasCiCd),
    },
    evidenceLevel: project.evidenceLevel || (evidence.hasBackend && evidence.hasDatabase ? "strong" : "moderate"),
    evidenceLabel: project.evidenceLabel || (project.source === "github" ? "Strong project evidence" : "Used in project"),
    isFeatured: Boolean(project.isFeatured),
    source: project.source || (project.repoUrl?.includes("github.com") ? "github" : "manual"),
    lastAnalyzedAt: project.lastAnalyzedAt || null,
    githubUpdatedAt: project.githubUpdatedAt || null,
    visibility: project.visibility || "public",
    complexity: ["basic", "intermediate", "advanced"].includes(project.complexity) ? project.complexity : null,
  };
}

function scoreProject(input = {}) {
  const project = normalizeProject(input);
  const e = project.evidence;
  let score = 0;
  score += e.hasRepository ? WEIGHTS.repository : 0;
  score += e.hasDeployment ? WEIGHTS.deployment : 0;
  score += e.hasReadme ? WEIGHTS.readme : 0;
  score += e.hasFrontend ? WEIGHTS.frontend : 0;
  score += e.hasBackend ? WEIGHTS.backend : 0;
  score += e.hasDatabase ? WEIGHTS.database : 0;
  score += e.hasAuthentication ? WEIGHTS.authentication : 0;
  score += e.hasApiIntegration ? WEIGHTS.apiIntegration : 0;
  score += e.hasDocker ? WEIGHTS.docker : 0;
  score += e.hasCiCd ? WEIGHTS.cicd : 0;
  score += Math.min(WEIGHTS.featureDepth, project.features.length * 2);
  score += Math.min(WEIGHTS.technologyBreadth, project.technologies.length);
  score = Math.max(0, Math.min(100, score));

  const evidenceCount = Object.values(e).filter(Boolean).length + project.features.length + project.technologies.length;
  const projectLevel = score >= 75 ? "strong" : score >= 45 ? "substantial" : score > 0 ? "limited" : "unverified";
  
  return {
    ...project,
    projectScore: score,
    projectLevel,
    evidenceCount,
  };
}

function normalizeProjectEvidence(profile = {}) {
  const explicit = (profile.projectDetails || profile.projectsDetail || []).map(scoreProject);
  const knownRepos = new Set(explicit.map((p) => p.repoUrl).filter(Boolean));

  const derived = (profile.githubStats?.repositories || [])
    .filter((repo) => !knownRepos.has(repo.url))
    .map((repo) => {
      const skills = [...new Set(repo.usedSkills || [])];
      const normalized = new Set(skills.map(normalizeSkill));
      return scoreProject({
        name: repo.name,
        description: repo.description,
        repoUrl: repo.url,
        liveUrl: repo.liveUrl,
        technologies: skills,
        source: "github",
        evidence: {
          hasRepository: true,
          hasDeployment: Boolean(repo.liveUrl),
          hasReadme: Boolean(repo.hasReadme),
          hasFrontend: normalized.has("react") || normalized.has("nextjs"),
          hasBackend: normalized.has("nodejs") || normalized.has("express") || normalized.has("flask") || normalized.has("fastapi"),
          hasDatabase: normalized.has("mongodb") || normalized.has("mongoose") || normalized.has("sql") || normalized.has("postgresql"),
          hasAuthentication: normalized.has("jwt") || normalized.has("oauth") || normalized.has("firebase"),
          hasApiIntegration: normalized.has("restapis"),
        },
      });
    });

  const allProjects = [...explicit, ...derived];
  const legacyCount = Number.isFinite(Number(profile.projects)) ? Number(profile.projects) : null;
  const scores = allProjects.map((item) => item.projectScore);
  const score = scores.length ? Math.round(scores.reduce((sum, val) => sum + val, 0) / scores.length) : null;

  return {
    count: allProjects.length || legacyCount,
    structured: allProjects,
    featured: allProjects.filter((p) => p.isFeatured).slice(0, 3),
    score,
    level: score == null ? (legacyCount != null ? "count_only" : "unavailable") : score >= 75 ? "strong" : score >= 45 ? "substantial" : "limited",
    evidenceCount: allProjects.reduce((sum, project) => sum + project.evidenceCount, 0),
    technologies: [...new Set(allProjects.flatMap((project) => project.technologies).map(normalizeSkill).filter(Boolean))],
    limitation: !allProjects.length && legacyCount != null ? "Add GitHub repositories or project details to improve project evidence." : null,
  };
}

module.exports = {
  WEIGHTS,
  normalizeProject,
  normalizeProjectEvidence,
  scoreProject,
};
