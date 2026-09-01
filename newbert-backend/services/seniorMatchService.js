const { calculateSimilarity, findClosestSeniors } = require("./alumniMatchingService");
const { normalizeSkill } = require("./skillNormalizationService");

function calculateSeniorMatch(student, senior, target = {}) {
  const goal =
    target.type === "gate"
      ? "gate"
      : target.type === "government-psu"
      ? "psu"
      : target.type === "core-placement"
      ? "core"
      : target.type === "data-ai"
      ? "data"
      : target.type === "internship"
      ? "internship"
      : "placement";

  const upgraded = calculateSimilarity(student, senior, { target, goal });
  const closest = findClosestSeniors(student, [senior], 1, { target, goal });
  const details = closest[0] || {};

  const isDemoSenior = Boolean(senior.isDemo || senior.isDummyData);
  const demoKey = senior.demoKey || senior.dummyKey || null;

  const comparison = {
    studentDsa: Number.isFinite(student.leetcodeStats?.totalSolved) ? student.leetcodeStats.totalSolved : null,
    seniorDsa: Number.isFinite(senior.dsa?.solved ?? senior.dsaSolved ?? senior.leetcodeStats?.totalSolved)
      ? Number(senior.dsa?.solved ?? senior.dsaSolved ?? senior.leetcodeStats?.totalSolved)
      : null,
    studentProjects: Number.isFinite(student.projects) ? student.projects : null,
    seniorProjects: Number.isFinite(senior.projects) ? senior.projects : Array.isArray(senior.projectDetails) ? senior.projectDetails.length : null,
    studentGithubRepos: Number.isFinite(student.githubStats?.publicRepos) ? student.githubStats.publicRepos : null,
    seniorGithubRepos: Number.isFinite(senior.github?.repositories ?? senior.githubPublicRepos ?? senior.githubStats?.publicRepos)
      ? Number(senior.github?.repositories ?? senior.githubPublicRepos ?? senior.githubStats?.publicRepos)
      : null,
    studentCgpa: Number.isFinite(student.cgpa) ? student.cgpa : null,
    seniorCgpa: Number.isFinite(senior.cgpa) ? senior.cgpa : null,
  };

  const seniorData = {
    id: String(senior._id || senior.id || demoKey || senior.name),
    name: senior.name,
    college: senior.college,
    company: senior.placement?.company || senior.company,
    role: senior.placement?.role || senior.role,
    package: senior.placement?.packageLpa ?? senior.package ?? null,
    avatar: senior.avatarUrl || "",
    isDemo: isDemoSenior,
    demoKey,
    preparationStrategy: senior.preparationStrategy || senior.placementPreparation || null,
    interviewExperience: senior.interviewExperience || null,
    mentorship: senior.mentorship || {
      available: senior.mentorshipEnabled,
      topics: senior.availableTopics || [],
    },
    skills: senior.skills || [],
    csFundamentals: senior.csFundamentals || [],
  };

  if (upgraded.overallScore != null) {
    return {
      score: upgraded.overallScore,
      overallScore: upgraded.overallScore,
      label: upgraded.label,
      breakdown: upgraded.breakdown,
      matchedSkills: details.matchedSkills || [],
      missingSkills: (details.missingSkills || []).map((item) => (typeof item === "string" ? item : item.skill)),
      comparison,
      senior: seniorData,
    };
  }

  return {
    score: 60,
    matchedSkills: [],
    missingSkills: [],
    comparison,
    senior: seniorData,
  };
}

function findBestSeniorMatch(student, alumni, target) {
  return alumni
    .map((senior) => calculateSeniorMatch(student, senior, target))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)[0] || null;
}

module.exports = { normalizeSkill, calculateSeniorMatch, findBestSeniorMatch };
