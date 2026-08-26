const DEFAULT_SECTIONS = Object.freeze({
  about: true,
  skills: true,
  projects: true,
  github: true,
  leetcode: true,
  achievements: true,
  education: true,
  careerGoal: true,
  courses: true,
});

function normalizePrivacy(privacy) {
  return {
    profileVisibility: privacy?.profileVisibility === "private" ? "private" : "public",
    sections: { ...DEFAULT_SECTIONS, ...(privacy?.sections || {}) },
  };
}

function identity(profile, user) {
  return {
    userId: String(user._id),
    name: user.name,
    avatar: profile.avatarUrl || user.avatarUrl || "",
    college: { id: profile.collegeId || null, name: profile.collegeName || profile.college || "" },
    branch: profile.branch || "",
    leaderboard: {
      streakDays: Number(profile.currentStreak) || 0,
      longestStreak: Number(profile.longestStreak) || 0,
      lastSyncedAt: profile.lastSyncedAt || null,
    },
  };
}

function serializePublicProfile(profile, user, today) {
  const privacy = normalizePrivacy(profile.privacy);
  const result = { ...identity(profile, user), private: privacy.profileVisibility === "private", visibleSections: [] };
  if (result.private) return result;
  result.cover = profile.coverUrl || "";

  const visible = privacy.sections;
  if (visible.about) {
    result.visibleSections.push("about");
    result.about = { bio: profile.bio || "" };
  }
  if (visible.skills) {
    result.visibleSections.push("skills");
    result.skills = (profile.skills || []).map((skill) => skill.name || skill).filter(Boolean);
  }
  if (visible.projects) {
    result.visibleSections.push("projects");
    result.projects = { count: profile.projects ?? null };
  }
  if (visible.github) {
    result.visibleSections.push("github");
    result.github = profile.githubStats ? {
      connected: Boolean(profile.githubUsername),
      username: profile.githubUsername || profile.githubStats.username || "",
      publicRepos: Number(profile.githubStats.publicRepos) || 0,
      followers: Number(profile.githubStats.followers) || 0,
      languages: profile.githubStats.languages || [],
      commitsToday: Number(today?.githubCommits) || 0,
      metricAvailable: Boolean(profile.githubStats.commitActivityAvailable),
    } : { connected: false };
  }
  if (visible.leetcode) {
    result.visibleSections.push("leetcode");
    result.leetcode = profile.leetcodeStats ? {
      connected: Boolean(profile.leetcodeUsername),
      username: profile.leetcodeUsername || profile.leetcodeStats.username || "",
      totalSolved: Number(profile.leetcodeStats.totalSolved) || 0,
      acceptedToday: Array.isArray(today?.leetcodeAcceptedProblems) ? new Set(today.leetcodeAcceptedProblems).size : 0,
      metricAvailable: Boolean(profile.leetcodeStats.acceptedActivityAvailable),
    } : { connected: false };
  }
  if (visible.education) {
    result.visibleSections.push("education");
    result.education = { graduationYear: profile.graduationYear || null, cgpa: profile.cgpa ?? null };
  }
  if (visible.careerGoal) {
    result.visibleSections.push("careerGoal");
    result.careerGoal = { role: profile.targetRole || "" };
  }

  // Jobs, applications, plans, senior matches, comparisons, and AI recommendations
  // are intentionally never read or returned by this serializer.
  return result;
}

module.exports = { DEFAULT_SECTIONS, normalizePrivacy, serializePublicProfile };
