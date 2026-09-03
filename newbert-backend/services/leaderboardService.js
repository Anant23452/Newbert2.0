const Profile = require("../Models/Profile");
const User = require("../Models/User");
const { resolveProfileCollege } = require("./collegeService");
const { normalizePrivacy } = require("./publicProfileService");
const { getDatesForRange, kolkataDate, getKolkataToday, getCurrentStreak } = require("../utils/dateNormalization");

const VALID_RANGES = new Set(["today", "7d", "30d", "overall"]);

function rangeLabel(range) {
  return ({ today: "today", "7d": "last 7 days", "30d": "last 30 days", overall: "overall" })[range] || range;
}

function activityMetrics(profile) {
  const days = Array.isArray(profile.activityCalendar) ? profile.activityCalendar : [];

  const computeForRange = (range) => {
    const dates = getDatesForRange(range);
    const acceptedProblems = new Set();
    let githubCommits = 0;
    let githubActiveDays = 0;
    let leetcodeSubmissions = 0;
    let leetcodeActiveDays = 0;

    for (const day of days) {
      if (dates && !dates.has(day.date)) continue;

      const commits = Number(day.githubCommits) || Number(day.github) || 0;
      if (commits > 0) {
        githubCommits += commits;
        githubActiveDays += 1;
      }

      for (const slug of day.leetcodeAcceptedProblems || []) {
        if (slug) acceptedProblems.add(slug);
      }

      const subs = Number(day.leetcode) || 0;
      if (subs > 0 || (day.leetcodeAcceptedProblems && day.leetcodeAcceptedProblems.length > 0)) {
        leetcodeSubmissions += subs;
        leetcodeActiveDays += 1;
      }
    }

    return {
      github: githubCommits,
      githubCommits,
      githubActiveDays,
      leetcode: acceptedProblems.size,
      leetcodeSolved: acceptedProblems.size,
      leetcodeSubmissions,
      leetcodeActiveDays,
    };
  };

  const activeDays = days.filter((day) =>
    Number(day.total) > 0 ||
    Number(day.github) > 0 ||
    Number(day.githubCommits) > 0 ||
    Number(day.leetcode) > 0 ||
    (day.leetcodeAcceptedProblems && day.leetcodeAcceptedProblems.length > 0)
  );

  const overallAccepted = new Set();
  let overallCommits = 0;
  let overallGithubDays = 0;
  let overallSubmissions = 0;
  let overallLeetcodeDays = 0;

  for (const day of days) {
    const commits = Number(day.githubCommits) || Number(day.github) || 0;
    if (commits > 0) {
      overallCommits += commits;
      overallGithubDays += 1;
    }
    for (const slug of day.leetcodeAcceptedProblems || []) {
      if (slug) overallAccepted.add(slug);
    }
    const subs = Number(day.leetcode) || 0;
    if (subs > 0 || (day.leetcodeAcceptedProblems && day.leetcodeAcceptedProblems.length > 0)) {
      overallSubmissions += subs;
      overallLeetcodeDays += 1;
    }
  }

  const totalSolvedFromStats = Number(profile.leetcodeStats?.totalSolved) || 0;
  const overallSolved = Math.max(totalSolvedFromStats, overallAccepted.size);

  return {
    today: computeForRange("today"),
    "7d": computeForRange("7d"),
    "30d": computeForRange("30d"),
    overall: {
      github: overallCommits,
      githubCommits: overallCommits,
      githubActiveDays: overallGithubDays,
      leetcode: overallSolved,
      leetcodeSolved: overallSolved,
      leetcodeSubmissions: overallSubmissions,
      leetcodeActiveDays: overallLeetcodeDays,
    },
    githubContributions: overallCommits,
    lastActivityDate: activeDays.map((day) => day.date).sort().at(-1) || "",
    currentStreak: getCurrentStreak(days) || Number(profile.currentStreak) || 0,
  };
}

function buildLeaderboardEntry(profile, user) {
  const activity = activityMetrics(profile);
  const privacy = normalizePrivacy(profile.privacy, profile.visibility);
  const leetcodeConnected = Boolean(privacy.sections.leetcode && (profile.leetcodeUsername || profile.leetcodeStats?.username));
  const githubConnected = Boolean(privacy.sections.github && (profile.githubUsername || profile.githubStats?.username));
  const streakVisible = Boolean(privacy.sections.leaderboardRank && privacy.sections.streakStats);

  // Canonical streak matching profile heatmap exactly
  const currentStreak = Number(profile.currentStreak) || activity.currentStreak;
  const longestStreak = Number(profile.longestStreak) || 0;

  return {
    userId: String(profile.userId),
    name: user.name,
    avatar: profile.avatarUrl || user.avatarUrl || "",
    college: { id: profile.collegeId || null, name: profile.collegeName || profile.college || "" },
    branch: profile.branch || "",
    lastActivityDate: activity.lastActivityDate,
    streak: streakVisible ? { current: currentStreak, longest: longestStreak, private: false } : { current: 0, longest: 0, private: true },
    leetcode: {
      connected: leetcodeConnected,
      activityAvailable: Boolean(profile.leetcodeStats?.acceptedActivityAvailable || activity.overall.leetcodeSolved > 0),
      totalSolved: Number(profile.leetcodeStats?.totalSolved) || activity.overall.leetcodeSolved,
      solved: {
        today: activity.today.leetcodeSolved,
        "7d": activity["7d"].leetcodeSolved,
        "30d": activity["30d"].leetcodeSolved,
        overall: Number(profile.leetcodeStats?.totalSolved) || activity.overall.leetcodeSolved,
      },
      submissions: {
        today: activity.today.leetcodeSubmissions,
        "7d": activity["7d"].leetcodeSubmissions,
        "30d": activity["30d"].leetcodeSubmissions,
        overall: activity.overall.leetcodeSubmissions,
      },
      today: activity.today.leetcodeSolved,
      "7d": activity["7d"].leetcodeSolved,
      "30d": activity["30d"].leetcodeSolved,
    },
    github: {
      connected: githubConnected,
      activityAvailable: Boolean(profile.githubStats?.contributionActivityAvailable || activity.overall.githubCommits > 0),
      commits: {
        today: activity.today.githubCommits,
        "7d": activity["7d"].githubCommits,
        "30d": activity["30d"].githubCommits,
        overall: activity.overall.githubCommits,
      },
      activeDays: {
        today: activity.today.githubActiveDays,
        "7d": activity["7d"].githubActiveDays,
        "30d": activity["30d"].githubActiveDays,
        overall: activity.overall.githubActiveDays,
      },
      today: activity.today.githubCommits,
      "7d": activity["7d"].githubCommits,
      "30d": activity["30d"].githubCommits,
      totalContributions: activity.overall.githubCommits,
    },
    lastSyncedAt: profile.lastSyncedAt || null,
  };
}

function canJoinPublicLeaderboard(profile) {
  const privacy = normalizePrivacy(profile.privacy, profile.visibility);
  return privacy.profileVisibility === "public" && privacy.sections.leaderboardRank;
}

function hasVerifiedStreakActivity(entry) {
  return !entry.streak.private && Boolean(entry.lastActivityDate || entry.streak.current > 0);
}

async function loadPublicEntries(query = {}) {
  const profiles = (await Profile.find(query).lean()).filter(canJoinPublicLeaderboard);
  const users = await User.find({ _id: { $in: profiles.map((profile) => profile.userId) } }).select("name avatarUrl").lean();
  const byId = new Map(users.map((user) => [String(user._id), user]));
  return profiles.map((profile) => byId.has(String(profile.userId)) ? buildLeaderboardEntry(profile, byId.get(String(profile.userId))) : null).filter(Boolean).filter((entry) => entry.college.name || entry.leetcode.connected || entry.github.connected);
}

// Deterministic tie-breaking: primary metric desc -> secondary metric desc -> last activity date desc -> stable userId asc.
function rankEntries(entries, metric, userId, search = "", secondaryMetric = null) {
  const all = entries
    .slice()
    .sort((a, b) => {
      const primaryDiff = metric(b) - metric(a);
      if (primaryDiff !== 0) return primaryDiff;
      if (secondaryMetric) {
        const secDiff = secondaryMetric(b) - secondaryMetric(a);
        if (secDiff !== 0) return secDiff;
      }
      const dateDiff = b.lastActivityDate.localeCompare(a.lastActivityDate);
      if (dateDiff !== 0) return dateDiff;
      return a.userId.localeCompare(b.userId);
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return {
    currentUser: all.find((entry) => entry.userId === String(userId)) || null,
    users: search
      ? all.filter((entry) => `${entry.name} ${entry.branch} ${entry.college?.name || ""}`.toLowerCase().includes(search.toLowerCase()))
      : all,
  };
}

function sectionStatus(mine, integration, available, metric) {
  if (!mine?.[integration]?.connected) return "not_connected";
  if (!available(mine)) return "refresh_required";
  return metric(mine) > 0 ? "ranked" : "no_activity";
}

async function normalizeKnownColleges() {
  const legacy = await Profile.find({ $or: [{ collegeId: null }, { collegeId: { $exists: false } }], college: { $type: "string", $ne: "" } }).select("college").lean();
  await Promise.all(legacy.map((profile) => resolveProfileCollege(profile, { persist: true })));
}

async function getLeaderboard({ userId, scope, search, leetcodeRange, githubRange }) {
  const lcRange = VALID_RANGES.has(leetcodeRange) ? leetcodeRange : "7d";
  const ghRange = VALID_RANGES.has(githubRange) ? githubRange : "7d";

  await normalizeKnownColleges();
  let mine = await Profile.findOne({ userId }).lean();
  const canonical = await resolveProfileCollege(mine, { persist: true });
  if (canonical) {
    mine = { ...mine, collegeId: canonical.collegeId, collegeName: canonical.name, college: canonical.name };
  }
  const resolvedCollege = canonical ? { id: canonical.collegeId, collegeId: canonical.collegeId, name: canonical.name, shortName: canonical.shortName || "" } : null;
  const emptySection = { currentUser: null, users: [] };
  if (scope === "college" && !resolvedCollege) {
    return {
      scope,
      needsCollege: true,
      resolvedCollege: null,
      college: null,
      streak: { ...emptySection, top: [] },
      leetcode: { ...emptySection, range: lcRange, status: "not_available" },
      github: { ...emptySection, range: ghRange, status: "not_available" },
    };
  }

  const query = { ...(scope === "college" ? { collegeId: resolvedCollege.id } : {}) };
  const entries = await loadPublicEntries(query);
  const mineEntry = entries.find((entry) => entry.userId === String(userId)) || null;

  // 1. Current Streak Leaderboard (NO time filter, purely Current Streak)
  const streakMetric = (entry) => entry.streak.current;
  const streak = rankEntries(entries.filter(hasVerifiedStreakActivity), streakMetric, userId, search);
  streak.top = streak.users.slice(0, 3);
  streak.rows = streak.users.slice(3, 10);

  // 2. GitHub Contributors Leaderboard (Ranked by verified GitHub commits)
  const ghAvailable = (entry) => entry.github.activityAvailable;
  const ghMetric = (entry) => entry.github.commits[ghRange] || 0;
  const ghSecondary = (entry) => entry.github.activeDays[ghRange] || 0;
  const github = rankEntries(entries.filter((entry) => ghAvailable(entry) && ghMetric(entry) > 0), ghMetric, userId, search, ghSecondary);
  github.top = github.users.slice(0, 3);
  github.rows = github.users.slice(3, 10);
  Object.assign(github, {
    range: ghRange,
    period: ghRange,
    label: rangeLabel(ghRange),
    metric: "verified commits",
    status: sectionStatus(mineEntry, "github", ghAvailable, ghMetric),
  });

  // 3. LeetCode Solvers Leaderboard (Primary: questions solved; Secondary: submissions)
  const lcAvailable = (entry) => lcRange === "overall" ? entry.leetcode.connected : entry.leetcode.activityAvailable;
  const lcMetric = (entry) => entry.leetcode.solved[lcRange] || 0;
  const lcSecondary = (entry) => entry.leetcode.submissions[lcRange] || 0;
  const leetcode = rankEntries(entries.filter((entry) => lcAvailable(entry) && lcMetric(entry) > 0), lcMetric, userId, search, lcSecondary);
  leetcode.top = leetcode.users.slice(0, 3);
  leetcode.rows = leetcode.users.slice(3, 10);
  Object.assign(leetcode, {
    range: lcRange,
    period: lcRange,
    label: rangeLabel(lcRange),
    metric: "questions solved",
    coverage: lcRange === "overall" ? "all solved problems" : "accepted solutions by date",
    status: sectionStatus(mineEntry, "leetcode", lcAvailable, lcMetric),
  });

  return {
    scope,
    needsCollege: false,
    resolvedCollege,
    college: scope === "college" ? resolvedCollege : null,
    streak,
    github,
    leetcode,
  };
}

function publicStreakEntry(entry) {
  if (!entry) return null;
  return { userId: entry.userId, name: entry.name, avatar: entry.avatar, college: entry.college, branch: entry.branch, streak: entry.streak, lastActivityDate: entry.lastActivityDate, rank: entry.rank };
}

async function getPublicStreakSnapshot(userId) {
  const owner = await Profile.findOne({ userId }).lean();
  const ownerPrivacy = owner ? normalizePrivacy(owner.privacy, owner.visibility) : null;
  if (!owner || !canJoinPublicLeaderboard(owner) || !ownerPrivacy.sections.streakStats) return { visible: false };
  const globalEntries = (await loadPublicEntries()).filter(hasVerifiedStreakActivity);
  const global = rankEntries(globalEntries, (entry) => entry.streak.current, userId);
  const collegeEntries = owner.collegeId ? globalEntries.filter((entry) => entry.college.id === owner.collegeId) : [];
  const college = rankEntries(collegeEntries, (entry) => entry.streak.current, userId);
  const preview = collegeEntries.length ? college : global;
  return { visible: true, profileOwner: publicStreakEntry(global.currentUser), collegeRank: college.currentUser?.rank || null, globalRank: global.currentUser?.rank || null, scope: collegeEntries.length ? "college" : "global", users: preview.users.slice(0, 6).map(publicStreakEntry) };
}

module.exports = {
  VALID_RANGES,
  activityMetrics,
  buildLeaderboardEntry,
  rankEntries,
  getLeaderboard,
  getPublicStreakSnapshot,
  canJoinPublicLeaderboard,
};
