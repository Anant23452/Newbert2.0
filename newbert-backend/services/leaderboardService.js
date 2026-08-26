const Profile = require("../Models/Profile");
const User = require("../Models/User");
const { matchCollege } = require("../data/aktuColleges");

const SCORE_FORMULA = Object.freeze({ leetcodeLifetimeCap: 500, leetcodeLifetimePoints: 400, githubLifetimeCap: 1000, githubLifetimePoints: 250, streakCap: 60, streakPoints: 150, leetcodeTodayCap: 10, leetcodeTodayPoints: 100, githubTodayCap: 20, githubTodayPoints: 100 });
function indiaDate(offset = 0) { const date = new Date(Date.now() + offset * 86400000); const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date); const value = Object.fromEntries(parts.map((part) => [part.type, part.value])); return `${value.year}-${value.month}-${value.day}`; }
function activity(profile) { const today = indiaDate(); const last7 = new Set(Array.from({ length: 7 }, (_, index) => indiaDate(-index))); const days = Array.isArray(profile.activityCalendar) ? profile.activityCalendar : []; const sum = (source, dates) => days.filter((day) => !dates || dates.has(day.date)).reduce((total, day) => total + (Number(day[source]) || 0), 0); return { githubTotal: sum("github"), githubToday: sum("github", new Set([today])), githubLast7Days: sum("github", last7), leetcodeToday: sum("leetcode", new Set([today])), leetcodeLast7Days: sum("leetcode", last7) }; }
const capped = (value, cap, points) => Math.min(Math.max(Number(value) || 0, 0), cap) / cap * points;
function calculateLeaderboardScore(profile) { const current = activity(profile); return Math.round(capped(profile.leetcodeStats?.totalSolved, 500, 400) + capped(current.githubTotal, 1000, 250) + capped(profile.currentStreak, 60, 150) + capped(current.leetcodeToday, 10, 100) + capped(current.githubToday, 20, 100)); }
function buildLeaderboardEntry(profile, user) { const current = activity(profile); const leetcodeConnected = Boolean(profile.leetcodeUsername || profile.leetcodeStats?.username); const githubConnected = Boolean(profile.githubUsername || profile.githubStats?.username); return { userId: String(profile.userId), name: user.name, avatar: profile.avatarUrl || user.avatarUrl || "", college: { id: profile.collegeId || null, name: profile.collegeName || profile.college || "" }, branch: profile.branch || "", overallScore: calculateLeaderboardScore(profile), streak: { current: Number(profile.currentStreak) || 0, longest: Number(profile.longestStreak) || 0 }, leetcode: leetcodeConnected ? { connected: true, totalSolved: Number(profile.leetcodeStats?.totalSolved) || 0, today: current.leetcodeToday, last7Days: current.leetcodeLast7Days, todayLabel: "submissions today" } : { connected: false }, github: githubConnected ? { connected: true, totalContributions: current.githubTotal, today: current.githubToday, last7Days: current.githubLast7Days } : { connected: false }, lastSyncedAt: profile.lastSyncedAt || null }; }
function ranked(entries, metric, userId, search) { const all = entries.slice().sort((a, b) => metric(b) - metric(a) || b.overallScore - a.overallScore || a.name.localeCompare(b.name)).map((entry, index) => ({ ...entry, rank: index + 1 })); const current = all.find((entry) => entry.userId === String(userId)) || null; const users = search ? all.filter((entry) => `${entry.name} ${entry.branch}`.toLowerCase().includes(search.toLowerCase())) : all; return { currentUser: current, users }; }
async function normalizeKnownColleges() {
  const legacy = await Profile.find({ $or: [{ collegeId: null }, { collegeId: { $exists: false } }], college: { $type: "string", $ne: "" } }).select("college").lean();
  const operations = legacy.map((profile) => ({ profile, college: matchCollege(profile.college) })).filter(({ college }) => college).map(({ profile, college }) => ({ updateOne: { filter: { _id: profile._id, $or: [{ collegeId: null }, { collegeId: { $exists: false } }] }, update: { $set: { collegeId: college.id, collegeName: college.name, college: college.name } } } }));
  if (operations.length) await Profile.bulkWrite(operations);
}
async function getLeaderboard({ userId, scope, search }) {
  await normalizeKnownColleges();
  let mine = await Profile.findOne({ userId }).lean();
  if (mine && !mine.collegeId) {
    const canonical = matchCollege(mine.college);
    if (canonical) {
      await Profile.updateOne({ _id: mine._id, collegeId: null }, { $set: { collegeId: canonical.id, collegeName: canonical.name, college: canonical.name } });
      mine = { ...mine, collegeId: canonical.id, collegeName: canonical.name, college: canonical.name };
    }
  }
  const resolvedCollege = mine?.collegeId ? { id: mine.collegeId, name: mine.collegeName || mine.college } : null;
  if (scope === "college" && !resolvedCollege) return { scope, needsCollege: true, resolvedCollege: null, college: null, overall: { currentUser: null, top: [] }, streak: { currentUser: null, users: [] }, leetcode: { currentUser: null, users: [] }, github: { currentUser: null, users: [] } };
  const query = { ...(scope === "college" ? { collegeId: resolvedCollege.id } : {}) };
  const profiles = await Profile.find(query).lean();
  const users = await User.find({ _id: { $in: profiles.map((profile) => profile.userId) } }).select("name avatarUrl").lean();
  const byId = new Map(users.map((user) => [String(user._id), user]));
  const entries = profiles.map((profile) => byId.has(String(profile.userId)) ? buildLeaderboardEntry(profile, byId.get(String(profile.userId))) : null).filter(Boolean).filter((entry) => entry.college.name || entry.leetcode.connected || entry.github.connected);
  const overallAll = ranked(entries, (entry) => entry.overallScore, userId, ""); const overallRanked = ranked(entries, (entry) => entry.overallScore, userId, search); const current = overallAll.currentUser; const overallUsers = overallRanked.users;
  const streak = ranked(entries, (entry) => entry.streak.current, userId, search); const leetcode = ranked(entries.filter((entry) => entry.leetcode.connected), (entry) => entry.leetcode.totalSolved, userId, search); const github = ranked(entries.filter((entry) => entry.github.connected), (entry) => entry.github.today, userId, search);
  return { scope, needsCollege: false, resolvedCollege, college: scope === "college" ? resolvedCollege : null, overall: { currentUser: current ? { ...current, gapToNext: current.rank > 1 ? overallAll.users[current.rank - 2].overallScore - current.overallScore : 0 } : null, top: overallUsers.slice(0, 3) }, streak, leetcode, github, errors: { streak: null, leetcode: null, github: null } };
}
module.exports = { SCORE_FORMULA, calculateLeaderboardScore, buildLeaderboardEntry, getLeaderboard };
