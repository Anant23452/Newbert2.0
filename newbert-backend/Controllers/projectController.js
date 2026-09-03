const Profile = require("../Models/Profile");
const User = require("../Models/User");
const Plan = require("../Models/Plan");
const { listUserRepositories, analyzeRepository } = require("../services/githubProjectAnalyzerService");
const { buildSkillEvidence } = require("../services/skillEvidenceService");
const { exceedsFeaturedLimit, normalizeProject, scoreProject } = require("../services/projectEvidenceService");

/**
 * Helper to retrieve user profile and github username
 */
async function getAuthenticatedProfile(userId) {
  const profile = await Profile.findOne({ userId });
  if (!profile) {
    const error = new Error("Profile not found.");
    error.status = 404;
    throw error;
  }
  return profile;
}

/**
 * Helper to get clean GitHub username for user
 */
function getGithubUsername(profile) {
  const username = profile.githubUsername || (profile.githubUrl ? profile.githubUrl.split("/").filter(Boolean).pop() : "");
  return username ? username.trim().replace(/^@/, "") : "";
}

/**
 * GET /api/projects/github/repos
 * Lists repositories belonging to authenticated student's connected GitHub account
 */
exports.getGithubRepositories = async (req, res, next) => {
  try {
    const profile = await getAuthenticatedProfile(req.auth.id);
    const username = getGithubUsername(profile);

    if (!username) {
      return res.status(400).json({
        connected: false,
        message: "Connect your GitHub account in your Profile first to analyze repositories.",
      });
    }

    const repositories = await listUserRepositories(username);
    return res.json({
      connected: true,
      username,
      repositories,
    });
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ message: "Connected GitHub user account not found on GitHub." });
    }
    return next(error);
  }
};

/**
 * POST /api/projects/github/analyze
 * Analyzes selected repository for tech stack, dependencies, and code usage
 */
exports.analyzeGithubRepository = async (req, res, next) => {
  try {
    const profile = await getAuthenticatedProfile(req.auth.id);
    const connectedUser = getGithubUsername(profile).toLowerCase();

    if (!connectedUser) {
      return res.status(400).json({ message: "Connect your GitHub account first." });
    }

    const repoFullName = String(req.body.repoFullName || req.body.repositoryFullName || req.body.name || "").trim();
    if (!repoFullName) {
      return res.status(400).json({ message: "Repository name is required." });
    }

    // Security: ensure the repo requested belongs to or is accessible by the connected GitHub account
    const repoOwner = repoFullName.includes("/") ? repoFullName.split("/")[0].toLowerCase() : connectedUser;
    const targetFullName = repoFullName.includes("/") ? repoFullName : `${connectedUser}/${repoFullName}`;

    if (repoOwner !== connectedUser && !req.body.allowExternal) {
      return res.status(403).json({
        message: "You can only analyze repositories belonging to your connected GitHub account.",
      });
    }

    const defaultBranch = req.body.defaultBranch || "main";
    const analysis = await analyzeRepository(targetFullName, defaultBranch);

    return res.json({
      analysis,
    });
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ message: "Repository not found on GitHub." });
    }
    return next(error);
  }
};

/**
 * POST /api/projects/github/add
 * Adds or updates a project with student confirmation into profile.projectDetails
 */
exports.addGithubProject = async (req, res, next) => {
  try {
    const profile = await getAuthenticatedProfile(req.auth.id);
    const body = req.body || {};

    const repoFullName = String(body.repositoryFullName || body.repoFullName || "").trim();
    const repoName = String(body.repositoryName || body.name || (repoFullName.includes("/") ? repoFullName.split("/")[1] : repoFullName)).trim();

    if (!repoName) {
      return res.status(400).json({ message: "Repository name or title is required." });
    }

    // If analysis was passed from frontend confirmation, use it; otherwise run analyzeRepository
    let projectAnalysis = body.analysis;
    if (!projectAnalysis && repoFullName) {
      projectAnalysis = await analyzeRepository(repoFullName).catch(() => null);
    }

    const confirmedTech = Array.isArray(body.confirmedTechnologies)
      ? body.confirmedTechnologies
      : (projectAnalysis?.confirmedTechnologies || body.technologies || []);

    const existingList = profile.projectDetails || [];
    const isEditing = existingList.find((p) => p.id === body.id || p.repositoryFullName === repoFullName || p.name === repoName);

    const newProject = normalizeProject({
      id: isEditing?.id || `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: body.title || isEditing?.title || projectAnalysis?.title || repoName,
      title: body.title || isEditing?.title || projectAnalysis?.title || repoName,
      description: body.description || isEditing?.description || projectAnalysis?.description || null,
      repoUrl: body.repoUrl || projectAnalysis?.repoUrl || `https://github.com/${repoFullName || repoName}`,
      liveUrl: body.liveUrl || projectAnalysis?.liveUrl || isEditing?.liveUrl || null,
      repositoryFullName: repoFullName || projectAnalysis?.repositoryFullName || null,
      repositoryName: repoName || projectAnalysis?.repositoryName || null,
      repositoryPrivate: Boolean(projectAnalysis?.repositoryPrivate ?? body.repositoryPrivate ?? isEditing?.repositoryPrivate),
      primaryLanguage: projectAnalysis?.primaryLanguage || isEditing?.primaryLanguage || null,
      technologies: confirmedTech,
      confirmedTechnologies: confirmedTech,
      detectedTechnologies: projectAnalysis?.detectedTechnologies || isEditing?.detectedTechnologies || [],
      evidence: projectAnalysis?.evidence || isEditing?.evidence || { hasRepository: true },
      evidenceLevel: projectAnalysis?.evidenceLevel || isEditing?.evidenceLevel || "moderate",
      evidenceLabel: projectAnalysis?.evidenceLabel || isEditing?.evidenceLabel || "Used in verified project",
      isFeatured: Boolean(body.isFeatured ?? isEditing?.isFeatured ?? false),
      source: "github",
      lastAnalyzedAt: new Date(),
      githubUpdatedAt: projectAnalysis?.githubUpdatedAt || new Date(),
      visibility: ["public", "private"].includes(body.visibility)
        ? body.visibility
        : isEditing?.visibility || "public",
    });

    const scored = scoreProject(newProject);

    // Update list: replace if exists, else append
    let updatedList;
    if (isEditing) {
      updatedList = existingList.map((p) => (p.id === isEditing.id ? scored : p));
    } else {
      updatedList = [...existingList, scored];
    }

    // Enforce max 3 featured projects
    if (exceedsFeaturedLimit(updatedList)) {
      return res.status(400).json({
        message: "You can feature a maximum of 3 projects. Unpin one before featuring another.",
      });
    }

    profile.projectDetails = updatedList;
    profile.projects = updatedList.length;

    // Rebuild skill evidence with new project evidence
    const skillEvidence = buildSkillEvidence(profile);
    profile.evidenceCache = {
      ...(profile.evidenceCache || {}),
      readiness: { updatedAt: new Date(), data: skillEvidence },
    };

    await profile.save();

    // Flag user's roadmap plan as needsRecalculation = true
    await Plan.findOneAndUpdate({ userId: req.auth.id }, { $set: { needsRecalculation: true } });

    const user = await User.findById(req.auth.id).select("name avatarUrl email");
    return res.status(201).json({
      message: "Project successfully added and analyzed.",
      project: scored,
      projects: updatedList,
      featuredProjects: updatedList.filter((p) => p.isFeatured).slice(0, 3),
      skillEvidence: skillEvidence.skills.slice(0, 8),
    });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ message: error.message });
    return next(error);
  }
};

/**
 * PATCH /api/projects/:id/visibility
 * Changes whether a confirmed project may appear on the owner's public profile.
 */
exports.updateProjectVisibility = async (req, res, next) => {
  try {
    const visibility = String(req.body.visibility || "");
    if (!["public", "private"].includes(visibility)) {
      return res.status(400).json({ message: "Choose public or private project visibility." });
    }
    const profile = await getAuthenticatedProfile(req.auth.id);
    const projectId = String(req.params.id);
    const target = (profile.projectDetails || []).find(
      (project) => String(project.id) === projectId || String(project._id) === projectId,
    );
    if (!target) {
      const belongsToAnotherUser = await Profile.exists({
        userId: { $ne: req.auth.id },
        $or: [{ "projectDetails.id": projectId }, { "projectDetails._id": projectId }],
      });
      if (belongsToAnotherUser) return res.status(403).json({ message: "You cannot change another user's project." });
      return res.status(404).json({ message: "Project not found in profile." });
    }

    profile.projectDetails = profile.projectDetails.map((project) => (
      String(project.id) === projectId || String(project._id) === projectId
        ? { ...project, visibility }
        : project
    ));
    await profile.save();
    const updatedProject = profile.projectDetails.find(
      (project) => String(project.id) === projectId || String(project._id) === projectId,
    );
    return res.json({
      message: `Project is now ${visibility}.`,
      project: updatedProject,
      projects: profile.projectDetails,
    });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ message: error.message });
    return next(error);
  }
};

/**
 * PATCH /api/projects/:id/featured
 * Toggles isFeatured for a project (max 3 allowed)
 */
exports.toggleFeaturedProject = async (req, res, next) => {
  try {
    const profile = await getAuthenticatedProfile(req.auth.id);
    const projectId = String(req.params.id);
    const existingList = profile.projectDetails || [];
    const target = existingList.find((p) => String(p.id) === projectId || String(p._id) === projectId);

    if (!target) {
      return res.status(404).json({ message: "Project not found in profile." });
    }

    const nextFeatured = !target.isFeatured;
    const currentFeaturedCount = existingList.filter((p) => p.isFeatured && String(p.id) !== projectId).length;

    if (nextFeatured && currentFeaturedCount >= 3) {
      return res.status(400).json({
        message: "You can feature a maximum of 3 projects on your main profile. Unpin one first.",
      });
    }

    profile.projectDetails = existingList.map((p) => {
      if (String(p.id) === projectId || String(p._id) === projectId) {
        return { ...p, isFeatured: nextFeatured };
      }
      return p;
    });

    await profile.save();
    return res.json({
      message: nextFeatured ? "Project pinned to featured." : "Project unpinned.",
      projects: profile.projectDetails,
      featuredProjects: profile.projectDetails.filter((p) => p.isFeatured).slice(0, 3),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/projects/:id/refresh
 * Re-analyzes a GitHub-backed project
 */
exports.refreshProjectAnalysis = async (req, res, next) => {
  try {
    const profile = await getAuthenticatedProfile(req.auth.id);
    const projectId = String(req.params.id);
    const existingList = profile.projectDetails || [];
    const project = existingList.find((p) => String(p.id) === projectId || String(p._id) === projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    const repoFullName = project.repositoryFullName || (project.repoUrl ? project.repoUrl.replace("https://github.com/", "") : null);
    if (!repoFullName) {
      return res.status(400).json({ message: "This project has no associated GitHub repository." });
    }

    const analysis = await analyzeRepository(repoFullName);
    const updatedProject = normalizeProject({
      ...project,
      detectedTechnologies: analysis.detectedTechnologies,
      confirmedTechnologies: project.confirmedTechnologies?.length ? project.confirmedTechnologies : analysis.confirmedTechnologies,
      technologies: project.confirmedTechnologies?.length ? project.confirmedTechnologies : analysis.confirmedTechnologies,
      evidence: analysis.evidence,
      evidenceLevel: analysis.evidenceLevel,
      evidenceLabel: analysis.evidenceLabel,
      lastAnalyzedAt: new Date(),
      githubUpdatedAt: analysis.githubUpdatedAt,
    });

    const scored = scoreProject(updatedProject);
    profile.projectDetails = existingList.map((p) => (String(p.id) === projectId ? scored : p));

    const skillEvidence = buildSkillEvidence(profile);
    profile.evidenceCache = {
      ...(profile.evidenceCache || {}),
      readiness: { updatedAt: new Date(), data: skillEvidence },
    };

    await profile.save();
    await Plan.findOneAndUpdate({ userId: req.auth.id }, { $set: { needsRecalculation: true } });

    return res.json({
      message: "Project analysis refreshed successfully.",
      project: scored,
      projects: profile.projectDetails,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/projects/:id/confirm-technologies
 * Student explicitly confirms usage of detected technologies in a project
 */
exports.confirmProjectTechnologies = async (req, res, next) => {
  try {
    const profile = await getAuthenticatedProfile(req.auth.id);
    const projectId = String(req.params.id);
    const existingList = profile.projectDetails || [];
    const project = existingList.find((p) => String(p.id) === projectId || String(p._id) === projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    const confirmedNames = Array.isArray(req.body.technologies) ? req.body.technologies.map(String) : [];
    const updatedDetected = (project.detectedTechnologies || []).map((tech) => {
      if (confirmedNames.includes(tech.name) || confirmedNames.includes(tech.canonical)) {
        return {
          ...tech,
          level: tech.level === "VERIFIED_PROJECT_USAGE" ? "VERIFIED_PROJECT_USAGE" : "STUDENT_CONFIRMED",
          evidenceLabel: tech.level === "VERIFIED_PROJECT_USAGE" ? "Strong project evidence" : "Detected & student-confirmed",
          reason: tech.level === "VERIFIED_PROJECT_USAGE" ? tech.reason : `${tech.name} configuration detected in repository and confirmed by student`,
          confidence: Math.max(tech.confidence || 0.5, 0.75),
        };
      }
      return tech;
    });

    const combinedConfirmed = [...new Set([...(project.confirmedTechnologies || project.technologies || []), ...confirmedNames])];

    const updatedProject = normalizeProject({
      ...project,
      detectedTechnologies: updatedDetected,
      confirmedTechnologies: combinedConfirmed,
      technologies: combinedConfirmed,
    });

    const scored = scoreProject(updatedProject);
    profile.projectDetails = existingList.map((p) => (String(p.id) === projectId || String(p._id) === projectId ? scored : p));

    const skillEvidence = buildSkillEvidence(profile);
    profile.evidenceCache = {
      ...(profile.evidenceCache || {}),
      readiness: { updatedAt: new Date(), data: skillEvidence },
    };

    await profile.save();
    await Plan.findOneAndUpdate({ userId: req.auth.id }, { $set: { needsRecalculation: true } });

    return res.json({
      message: "Technologies confirmed successfully.",
      project: scored,
      projects: profile.projectDetails,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/projects/:id
 * Removes a project from profile
 */
exports.deleteProject = async (req, res, next) => {
  try {
    const profile = await getAuthenticatedProfile(req.auth.id);
    const projectId = String(req.params.id);
    const existingList = profile.projectDetails || [];

    profile.projectDetails = existingList.filter((p) => String(p.id) !== projectId && String(p._id) !== projectId);
    profile.projects = profile.projectDetails.length;

    const skillEvidence = buildSkillEvidence(profile);
    profile.evidenceCache = {
      ...(profile.evidenceCache || {}),
      readiness: { updatedAt: new Date(), data: skillEvidence },
    };

    await profile.save();
    await Plan.findOneAndUpdate({ userId: req.auth.id }, { $set: { needsRecalculation: true } });

    return res.json({
      message: "Project removed.",
      projects: profile.projectDetails,
      featuredProjects: profile.projectDetails.filter((p) => p.isFeatured).slice(0, 3),
    });
  } catch (error) {
    return next(error);
  }
};
