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
  activityHeatmap: true,
  streakStats: true,
  leaderboardRank: true,
});

function normalizePrivacy(privacy) {
  const vis = privacy?.profileVisibility || privacy?.visibility;
  return {
    profileVisibility: vis === "private" ? "private" : "public",
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
      lastSyncedAt: profile.lastSyncedAt || null,
    },
  };
}

function canonicalProfileUrl(platform, username) {
  const value = String(username || "").trim();
  if (!value) return "";
  if (platform === "github") return `https://github.com/${encodeURIComponent(value)}`;
  return `https://leetcode.com/u/${encodeURIComponent(value)}`;
}

function safeLinkedinUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    return host === "linkedin.com" || host.endsWith(".linkedin.com") ? url.toString() : "";
  } catch {
    return "";
  }
}

function safeHttpUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function serializeFeaturedProjects(profile) {
  return (profile.projectDetails || [])
    .filter((project) => project?.isFeatured === true && project.visibility !== "private")
    .slice(0, 3)
    .map((project) => {
      const technologies = project.confirmedTechnologies?.length
        ? project.confirmedTechnologies
        : project.technologies || [];
      return {
        id: String(project.id || project._id || project.repositoryName || project.name),
        name: String(project.title || project.name || "Project"),
        description: project.description ? String(project.description).slice(0, 280) : "",
        technologies: [...new Set(technologies.map(String).map((item) => item.trim()).filter(Boolean))].slice(0, 8),
        evidenceLabel: project.evidenceLabel ? String(project.evidenceLabel) : "",
        repoUrl: project.repositoryPrivate ? "" : safeHttpUrl(project.repoUrl),
        liveUrl: safeHttpUrl(project.liveUrl),
      };
    });
}

function publicActivityCalendar(profile, visible) {
  return (profile.activityCalendar || []).map((day) => {
    const github = visible.github ? Number(day.github) || 0 : 0;
    const leetcode = visible.leetcode ? Number(day.leetcode) || 0 : 0;
    return {
      date: day.date,
      github,
      ...(visible.github ? {
        githubCommits: Number(day.githubCommits) || 0,
        githubPullRequests: Number(day.githubPullRequests) || 0,
        githubIssues: Number(day.githubIssues) || 0,
      } : {}),
      leetcode,
      total: github + leetcode,
    };
  }).filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day.date || "") && day.total > 0);
}

function serializePublicProfile(profile, user, today, streakLeaderboard = null) {
  const privacy = normalizePrivacy(profile.privacy);
  const visible = privacy.sections;
  const result = {
    ...identity(profile, user),
    private: privacy.profileVisibility === "private",
    visibleSections: [],
    activityPrivacy: {
      heatmapVisible: Boolean(visible.activityHeatmap),
      streakStatsVisible: Boolean(visible.streakStats),
      leaderboardRankVisible: Boolean(visible.leaderboardRank),
    },
  };
  if (result.private) {
    return {
      userId: result.userId,
      name: result.name,
      displayName: result.name,
      avatar: result.avatar,
      private: true,
      isPrivate: true,
      visibility: "private",
      message: "This profile is private.",
      visibleSections: [],
    };
  }
  result.cover = profile.coverUrl || "";

  if (visible.streakStats) {
    result.leaderboard.streakDays = Number(profile.currentStreak) || 0;
    result.leaderboard.longestStreak = Number(profile.longestStreak) || 0;
  }
  if (visible.about) {
    result.visibleSections.push("about");
    result.about = { bio: profile.bio || "" };
  }
  if (visible.skills) {
    result.visibleSections.push("skills");
    result.skills = (profile.skills || []).map((skill) => skill.name || skill).filter(Boolean);
  }
  if (visible.projects) {
    const featured = serializeFeaturedProjects(profile);
    result.visibleSections.push("projects");
    result.projects = {
      count: featured.length,
      featured,
    };
  }
  if (visible.github) {
    result.visibleSections.push("github");
    result.github = profile.githubStats ? {
      connected: Boolean(profile.githubUsername),
      username: profile.githubUsername || profile.githubStats.username || "",
      url: canonicalProfileUrl("github", profile.githubUsername || profile.githubStats.username),
      publicRepos: Number(profile.githubStats.publicRepos) || 0,
      followers: Number(profile.githubStats.followers) || 0,
      languages: profile.githubStats.languages || [],
      activityToday: Number(today?.github) || 0,
      commitsToday: Number(today?.githubCommits) || 0,
      metricAvailable: Boolean(profile.githubStats.contributionActivityAvailable),
    } : { connected: false };
  }
  if (visible.leetcode) {
    result.visibleSections.push("leetcode");
    result.leetcode = profile.leetcodeStats ? {
      connected: Boolean(profile.leetcodeUsername),
      username: profile.leetcodeUsername || profile.leetcodeStats.username || "",
      url: canonicalProfileUrl("leetcode", profile.leetcodeUsername || profile.leetcodeStats.username),
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

  // LinkedIn is intentionally guarded: only visible on public profiles.
  // There is no dedicated linkedin section toggle; it is controlled by overall profile visibility.
  const linkedinUrl = safeLinkedinUrl(profile.linkedinUrl);
  if (linkedinUrl) result.linkedin = { url: linkedinUrl };

  result.activitySources = {
    github: Boolean(visible.github && (profile.githubUsername || profile.githubStats?.username)),
    leetcode: Boolean(visible.leetcode && (profile.leetcodeUsername || profile.leetcodeStats?.username)),
  };
  if (visible.activityHeatmap && (visible.github || visible.leetcode)) result.activityCalendar = publicActivityCalendar(profile, visible);
  if (visible.leaderboardRank && visible.streakStats && streakLeaderboard) result.streakLeaderboard = streakLeaderboard;

  // Jobs, applications, plans, senior matches, comparisons, and AI recommendations
  // are intentionally never read or returned by this serializer.
  return result;
}

module.exports = { DEFAULT_SECTIONS, normalizePrivacy, serializePublicProfile, serializeFeaturedProjects };
