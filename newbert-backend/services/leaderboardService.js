const Profile = require("../Models/Profile");
const User = require("../Models/User");
const { resolveProfileCollege } = require("./collegeService");

const VALID_RANGES = new Set(["today", "7d", "30d", "overall"]);

function indiaDate(offset = 0) {
  const date = new Date(Date.now() + offset * 86400000);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function datesForRange(range) {
  const length = range === "today" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : 0;
  return new Set(Array.from({ length }, (_, index) => indiaDate(-index)));
}

function rangeLabel(range) { return ({ today: "today", "7d": "last 7 days", "30d": "last 30 days", overall: "overall" })[range]; }

function activityMetrics(profile) {
  const days = Array.isArray(profile.activityCalendar) ? profile.activityCalendar : [];
  const metricFor = (range) => {
    const dates = datesForRange(range);
    const acceptedProblems = new Set();
    let githubCommits = 0;
    for (const day of days) {
      if (!dates.has(day.date)) continue;
      for (const slug of day.leetcodeAcceptedProblems || []) if (slug) acceptedProblems.add(slug);
      githubCommits += Number(day.githubCommits) || 0;
    }
    return { leetcode: acceptedProblems.size, github: githubCommits };
  };
  const activeDays = days.filter((day) => Number(day.total) > 0 || Number(day.github) > 0 || Number(day.leetcode) > 0);
  return { today: metricFor("today"), "7d": metricFor("7d"), "30d": metricFor("30d"), githubContributions: days.reduce((total, day) => total + (Number(day.github) || 0), 0), lastActivityDate: activeDays.map((day) => day.date).sort().at(-1) || "" };
}

function buildLeaderboardEntry(profile, user) {
  const activity = activityMetrics(profile);
  const leetcodeConnected = Boolean(profile.leetcodeUsername || profile.leetcodeStats?.username);
  const githubConnected = Boolean(profile.githubUsername || profile.githubStats?.username);
  return {
    userId: String(profile.userId), name: user.name, avatar: profile.avatarUrl || user.avatarUrl || "",
    college: { id: profile.collegeId || null, name: profile.collegeName || profile.college || "" }, branch: profile.branch || "", lastActivityDate: activity.lastActivityDate,
    streak: { current: Number(profile.currentStreak) || 0, longest: Number(profile.longestStreak) || 0 },
    leetcode: leetcodeConnected ? { connected: true, activityAvailable: Boolean(profile.leetcodeStats?.acceptedActivityAvailable), totalSolved: Number(profile.leetcodeStats?.totalSolved) || 0, today: activity.today.leetcode, "7d": activity["7d"].leetcode, "30d": activity["30d"].leetcode } : { connected: false, activityAvailable: false },
    github: githubConnected ? { connected: true, commitActivityAvailable: Boolean(profile.githubStats?.commitActivityAvailable), contributionActivityAvailable: Boolean(profile.githubStats?.contributionActivityAvailable || (profile.githubStats?.lastSyncedAt && !profile.githubStats?.activityError)), totalContributions: activity.githubContributions, today: activity.today.github, "7d": activity["7d"].github, "30d": activity["30d"].github } : { connected: false, commitActivityAvailable: false, contributionActivityAvailable: false },
    lastSyncedAt: profile.lastSyncedAt || null,
  };
}

// Ties use most recent verified activity, then stable userId ascending.
function rankEntries(entries, metric, userId, search = "") {
  const all = entries.slice().sort((a, b) => metric(b) - metric(a) || b.lastActivityDate.localeCompare(a.lastActivityDate) || a.userId.localeCompare(b.userId)).map((entry, index) => ({ ...entry, rank: index + 1 }));
  return { currentUser: all.find((entry) => entry.userId === String(userId)) || null, users: search ? all.filter((entry) => `${entry.name} ${entry.branch}`.toLowerCase().includes(search.toLowerCase())) : all };
}

function sectionStatus(mine, integration, available, metric) { if (!mine?.[integration]?.connected) return "not_connected"; if (!available(mine)) return "refresh_required"; return metric(mine) > 0 ? "ranked" : "no_activity"; }
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
  if (scope === "college" && !resolvedCollege) return { scope, needsCollege: true, resolvedCollege: null, college: null, streak: { ...emptySection, top: [] }, leetcode: { ...emptySection, range: lcRange, status: "not_available" }, github: { ...emptySection, range: ghRange, status: "not_available" } };
  const query = { ...(scope === "college" ? { collegeId: resolvedCollege.id } : {}) };
  const profiles = await Profile.find(query).lean();
  const users = await User.find({ _id: { $in: profiles.map((profile) => profile.userId) } }).select("name avatarUrl").lean();
  const byId = new Map(users.map((user) => [String(user._id), user]));
  const entries = profiles.map((profile) => byId.has(String(profile.userId)) ? buildLeaderboardEntry(profile, byId.get(String(profile.userId))) : null).filter(Boolean).filter((entry) => entry.college.name || entry.leetcode.connected || entry.github.connected);
  const mineEntry = entries.find((entry) => entry.userId === String(userId)) || null;
  const streak = rankEntries(entries, (entry) => entry.streak.current, userId, search); streak.top = streak.users.slice(0, 3);
  const lcAvailable = (entry) => lcRange === "overall" ? entry.leetcode.connected : entry.leetcode.activityAvailable;
  const lcMetric = (entry) => lcRange === "overall" ? entry.leetcode.totalSolved : entry.leetcode[lcRange];
  const leetcode = rankEntries(entries.filter((entry) => lcAvailable(entry) && lcMetric(entry) > 0), lcMetric, userId, search);
  Object.assign(leetcode, { range: lcRange, label: rangeLabel(lcRange), metric: "questions", coverage: lcRange === "overall" ? "all solved problems" : "latest 100 accepted submissions", status: sectionStatus(mineEntry, "leetcode", lcAvailable, lcMetric) });
  const ghAvailable = (entry) => ghRange === "overall" ? entry.github.contributionActivityAvailable : entry.github.commitActivityAvailable;
  const ghMetric = (entry) => ghRange === "overall" ? entry.github.totalContributions : entry.github[ghRange];
  const github = rankEntries(entries.filter((entry) => ghAvailable(entry) && ghMetric(entry) > 0), ghMetric, userId, search);
  Object.assign(github, { range: ghRange, label: rangeLabel(ghRange), metric: ghRange === "overall" ? "contributions" : "commits", status: sectionStatus(mineEntry, "github", ghAvailable, ghMetric) });
  return { scope, needsCollege: false, resolvedCollege, college: scope === "college" ? resolvedCollege : null, streak, leetcode, github };
}
module.exports = { VALID_RANGES, activityMetrics, buildLeaderboardEntry, rankEntries, getLeaderboard };
