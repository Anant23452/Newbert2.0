const Profile = require("../Models/Profile");
const User = require("../Models/User");
const { resolveProfileCollege } = require("./collegeService");
const { normalizePrivacy } = require("./publicProfileService");
const { getDatesForRange, kolkataDate, getKolkataToday } = require("../utils/dateNormalization");

const VALID_RANGES = new Set(["today", "7d", "30d", "overall"]);
const VALID_STREAK_RANGES = new Set(["current", "longest"]);

function rangeLabel(range) {
  return ({ today: "today", "7d": "last 7 days", "30d": "last 30 days", overall: "overall" })[range] || range;
}

function activityMetrics(profile) {
  const days = Array.isArray(profile.activityCalendar) ? profile.activityCalendar : [];
  const metricFor = (range) => {
    const dates = getDatesForRange(range);
    const acceptedProblems = new Set();
    let githubActivity = 0;
    for (const day of days) {
      if (dates && !dates.has(day.date)) continue;
      for (const slug of day.leetcodeAcceptedProblems || []) if (slug) acceptedProblems.add(slug);
      githubActivity += Number(day.github) || 0;
    }
    return { leetcode: acceptedProblems.size, github: githubActivity };
  };
  const activeDays = days.filter((day) => Number(day.total) > 0 || Number(day.github) > 0 || Number(day.leetcode) > 0);
  return {
    today: metricFor("today"),
    "7d": metricFor("7d"),
    "30d": metricFor("30d"),
    githubContributions: days.reduce((total, day) => total + (Number(day.github) || 0), 0),
    lastActivityDate: activeDays.map((day) => day.date).sort().at(-1) || "",
  };
}

function buildLeaderboardEntry(profile, user) {
  const activity = activityMetrics(profile);
  const privacy = normalizePrivacy(profile.privacy);
  const leetcodeConnected = Boolean(privacy.sections.leetcode && (profile.leetcodeUsername || profile.leetcodeStats?.username));
  const githubConnected = Boolean(privacy.sections.github && (profile.githubUsername || profile.githubStats?.username));
  const streakVisible = Boolean(privacy.sections.leaderboardRank && privacy.sections.streakStats);
  const currentStreak = Number(profile.currentStreak) || 0;
  const longestStreak = Number(profile.longestStreak) || 0;
  const totalSolved = Number(profile.leetcodeStats?.totalSolved) || 0;
  const githubTotal = activity.githubContributions || 0;
  const overallScore = currentStreak * 10 + totalSolved * 5 + githubTotal;

  return {
    userId: String(profile.userId),
    name: user.name,
    avatar: profile.avatarUrl || user.avatarUrl || "",
    college: { id: profile.collegeId || null, name: profile.collegeName || profile.college || "" },
    branch: profile.branch || "",
    lastActivityDate: activity.lastActivityDate,
    overallScore,
    streak: streakVisible ? { current: currentStreak, longest: longestStreak } : { current: 0, longest: 0, private: true },
    leetcode: leetcodeConnected ? { connected: true, activityAvailable: Boolean(profile.leetcodeStats?.acceptedActivityAvailable), totalSolved, today: activity.today.leetcode, "7d": activity["7d"].leetcode, "30d": activity["30d"].leetcode } : { connected: false, activityAvailable: false },
    github: githubConnected ? { connected: true, activityAvailable: Boolean(profile.githubStats?.contributionActivityAvailable), contributionActivityAvailable: Boolean(profile.githubStats?.contributionActivityAvailable), totalContributions: githubTotal, today: activity.today.github, "7d": activity["7d"].github, "30d": activity["30d"].github } : { connected: false, activityAvailable: false, contributionActivityAvailable: false },
    lastSyncedAt: profile.lastSyncedAt || null,
  };
}

function canJoinPublicLeaderboard(profile) {
  const privacy = normalizePrivacy(profile.privacy);
  return privacy.profileVisibility === "public" && privacy.sections.leaderboardRank;
}

function hasVerifiedStreakActivity(entry) {
  return !entry.streak.private && Boolean(entry.lastActivityDate || entry.streak.current > 0 || entry.streak.longest > 0);
}

async function loadPublicEntries(query = {}) {
  const profiles = (await Profile.find(query).lean()).filter(canJoinPublicLeaderboard);
  const users = await User.find({ _id: { $in: profiles.map((profile) => profile.userId) } }).select("name avatarUrl").lean();
  const byId = new Map(users.map((user) => [String(user._id), user]));
  return profiles.map((profile) => byId.has(String(profile.userId)) ? buildLeaderboardEntry(profile, byId.get(String(profile.userId))) : null).filter(Boolean).filter((entry) => entry.college.name || entry.leetcode.connected || entry.github.connected);
}

// Ties use most recent verified activity, then stable userId ascending.
function rankEntries(entries, metric, userId, search = "") {
  const all = entries.slice().sort((a, b) => metric(b) - metric(a) || b.lastActivityDate.localeCompare(a.lastActivityDate) || a.userId.localeCompare(b.userId)).map((entry, index) => ({ ...entry, rank: index + 1 }));
  return { currentUser: all.find((entry) => entry.userId === String(userId)) || null, users: search ? all.filter((entry) => `${entry.name} ${entry.branch}`.toLowerCase().includes(search.toLowerCase())) : all };
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

async function getLeaderboard({ userId, scope, search, leetcodeRange, githubRange, streakRange }) {
  const lcRange = VALID_RANGES.has(leetcodeRange) ? leetcodeRange : "7d";
  const ghRange = VALID_RANGES.has(githubRange) ? githubRange : "7d";
  const stRange = VALID_STREAK_RANGES.has(streakRange) ? streakRange : "current";

  await normalizeKnownColleges();
  let mine = await Profile.findOne({ userId }).lean();
  const canonical = await resolveProfileCollege(mine, { persist: true });
  if (canonical) {
    mine = { ...mine, collegeId: canonical.collegeId, collegeName: canonical.name, college: canonical.name };
  }
  const resolvedCollege = canonical ? { id: canonical.collegeId, collegeId: canonical.collegeId, name: canonical.name, shortName: canonical.shortName || "" } : null;
  const emptySection = { currentUser: null, users: [] };
  if (scope === "college" && !resolvedCollege) {
    return { scope, needsCollege: true, resolvedCollege: null, college: null, overall: { ...emptySection, top: [] }, streak: { ...emptySection, top: [] }, leetcode: { ...emptySection, range: lcRange, status: "not_available" }, github: { ...emptySection, range: ghRange, status: "not_available" } };
  }

  const query = { ...(scope === "college" ? { collegeId: resolvedCollege.id } : {}) };
  const entries = await loadPublicEntries(query);
  const mineEntry = entries.find((entry) => entry.userId === String(userId)) || null;

  // Overall Board
  const overall = rankEntries(entries.filter((entry) => entry.overallScore > 0), (entry) => entry.overallScore, userId, search);
  overall.top = overall.users.slice(0, 3);

  // Streak Board
  const streakMetric = (entry) => stRange === "longest" ? entry.streak.longest : entry.streak.current;
  const streak = rankEntries(entries.filter(hasVerifiedStreakActivity), streakMetric, userId, search);
  streak.top = streak.users.slice(0, 3);
  streak.range = stRange;

  // LeetCode Board
  const lcAvailable = (entry) => lcRange === "overall" ? entry.leetcode.connected : entry.leetcode.activityAvailable;
  const lcMetric = (entry) => lcRange === "overall" ? entry.leetcode.totalSolved : entry.leetcode[lcRange];
  const leetcode = rankEntries(entries.filter((entry) => lcAvailable(entry) && lcMetric(entry) > 0), lcMetric, userId, search);
  leetcode.top = leetcode.users.slice(0, 3);
  Object.assign(leetcode, { range: lcRange, label: rangeLabel(lcRange), metric: "questions", coverage: lcRange === "overall" ? "all solved problems" : "latest 100 accepted submissions", status: sectionStatus(mineEntry, "leetcode", lcAvailable, lcMetric) });

  // GitHub Board
  const ghAvailable = (entry) => entry.github.activityAvailable;
  const ghMetric = (entry) => ghRange === "overall" ? entry.github.totalContributions : entry.github[ghRange];
  const github = rankEntries(entries.filter((entry) => ghAvailable(entry) && ghMetric(entry) > 0), ghMetric, userId, search);
  github.top = github.users.slice(0, 3);
  Object.assign(github, { range: ghRange, label: rangeLabel(ghRange), metric: "verified GitHub activity", status: sectionStatus(mineEntry, "github", ghAvailable, ghMetric) });

  return { scope, needsCollege: false, resolvedCollege, college: scope === "college" ? resolvedCollege : null, overall, streak, leetcode, github };
}

function publicStreakEntry(entry) {
  if (!entry) return null;
  return { userId: entry.userId, name: entry.name, avatar: entry.avatar, college: entry.college, branch: entry.branch, streak: entry.streak, lastActivityDate: entry.lastActivityDate, rank: entry.rank };
}

async function getPublicStreakSnapshot(userId) {
  const owner = await Profile.findOne({ userId }).lean();
  const ownerPrivacy = owner ? normalizePrivacy(owner.privacy) : null;
  if (!owner || !canJoinPublicLeaderboard(owner) || !ownerPrivacy.sections.streakStats) return { visible: false };
  const globalEntries = (await loadPublicEntries()).filter(hasVerifiedStreakActivity);
  const global = rankEntries(globalEntries, (entry) => entry.streak.current, userId);
  const collegeEntries = owner.collegeId ? globalEntries.filter((entry) => entry.college.id === owner.collegeId) : [];
  const college = rankEntries(collegeEntries, (entry) => entry.streak.current, userId);
  const preview = collegeEntries.length ? college : global;
  return { visible: true, profileOwner: publicStreakEntry(global.currentUser), collegeRank: college.currentUser?.rank || null, globalRank: global.currentUser?.rank || null, scope: collegeEntries.length ? "college" : "global", users: preview.users.slice(0, 6).map(publicStreakEntry) };
}

module.exports = { VALID_RANGES, VALID_STREAK_RANGES, activityMetrics, buildLeaderboardEntry, rankEntries, getLeaderboard, getPublicStreakSnapshot, canJoinPublicLeaderboard };
