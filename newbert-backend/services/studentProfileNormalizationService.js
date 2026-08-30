const { normalizeSkill } = require("./seniorMatchService");

function kolkataDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const date = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${date.year}-${date.month}-${date.day}`;
}

function dateDaysAgo(days) {
  const value = new Date();
  value.setUTCHours(12, 0, 0, 0);
  value.setUTCDate(value.getUTCDate() - days);
  return kolkataDate(value);
}

function normalizeSkills(skills = []) {
  return skills.map((skill) => {
    const item = typeof skill === "string" ? { name: skill, source: "manual" } : skill;
    const source = item.source || "manual";
    return {
      name: String(item.name || "").trim(),
      normalizedName: normalizeSkill(item.name),
      score: Number.isFinite(Number(item.score)) && Number(item.score) > 0 ? Number(item.score) : null,
      evidence: [{
        source: source === "manual" ? "self_reported" : source,
        supported: source !== "manual",
      }],
    };
  }).filter((skill) => skill.name);
}

function normalizeStudentProfile(profile = {}) {
  const skills = normalizeSkills(profile.skills);
  const leetcode = profile.leetcodeStats && Number.isFinite(Number(profile.leetcodeStats.totalSolved)) ? profile.leetcodeStats : null;
  const github = profile.githubStats || null;
  const recentStart = dateDaysAgo(29);
  const recentActivity = (profile.activityCalendar || []).filter((day) => day.date >= recentStart && day.date <= kolkataDate());
  const acceptedProblems = new Set(recentActivity.flatMap((day) => Array.isArray(day.leetcodeAcceptedProblems) ? day.leetcodeAcceptedProblems : []));
  const activeDaysLast30 = recentActivity.filter((day) => (Number(day.github) || 0) + (Number(day.leetcode) || 0) > 0).length;

  return {
    userId: profile.userId ? String(profile.userId) : null,
    academics: {
      college: profile.collegeName || profile.college || null,
      collegeId: profile.collegeId || null,
      branch: profile.branch || null,
      graduationYear: Number.isFinite(profile.graduationYear) ? profile.graduationYear : null,
      cgpa: Number.isFinite(profile.cgpa) ? profile.cgpa : null,
    },
    goals: { targetRole: profile.targetRole || null },
    dsa: {
      available: Boolean(leetcode),
      totalSolved: leetcode ? Number(leetcode.totalSolved) : null,
      easy: leetcode && Number.isFinite(Number(leetcode.easySolved)) ? Number(leetcode.easySolved) : null,
      medium: leetcode && Number.isFinite(Number(leetcode.mediumSolved)) ? Number(leetcode.mediumSolved) : null,
      hard: leetcode && Number.isFinite(Number(leetcode.hardSolved)) ? Number(leetcode.hardSolved) : null,
      topicDataAvailable: false,
      topics: [],
      recentActivity: {
        acceptedProblemsInRecentFeed: acceptedProblems.size,
        available: Boolean(leetcode?.acceptedActivityAvailable),
        limitation: "LeetCode exposes a limited recent accepted-submission feed; this is not treated as complete topic or newly-solved history.",
      },
    },
    development: { skills },
    projects: {
      available: Number.isFinite(profile.projects),
      count: Number.isFinite(profile.projects) ? profile.projects : null,
      evidenceLevel: Number.isFinite(profile.projects) ? "count_only" : "unavailable",
    },
    github: {
      available: Boolean(github),
      username: github?.username || null,
      publicRepos: Number.isFinite(Number(github?.publicRepos)) ? Number(github.publicRepos) : null,
      languages: Array.isArray(github?.languages) ? github.languages : [],
      contributionActivityAvailable: Boolean(github?.contributionActivityAvailable),
      contributionsLast30: recentActivity.reduce((sum, day) => sum + (Number(day.github) || 0), 0),
    },
    activity: {
      available: Boolean(github?.contributionActivityAvailable || leetcode?.acceptedActivityAvailable || recentActivity.length),
      activeDaysLast30,
      githubContributionsLast30: recentActivity.reduce((sum, day) => sum + (Number(day.github) || 0), 0),
      leetcodeSubmissionsLast30: recentActivity.reduce((sum, day) => sum + (Number(day.leetcode) || 0), 0),
      timezone: "Asia/Kolkata",
    },
    dataSources: {
      targetRole: Boolean(profile.targetRole),
      academicProfile: Boolean(profile.college && profile.branch),
      skills: skills.length > 0,
      leetcode: Boolean(leetcode),
      github: Boolean(github),
      projects: Number.isFinite(profile.projects),
    },
    lastSyncedAt: profile.lastSyncedAt || null,
  };
}

module.exports = { kolkataDate, normalizeSkills, normalizeStudentProfile };
