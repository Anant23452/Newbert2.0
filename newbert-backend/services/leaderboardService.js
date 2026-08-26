const Profile = require("../Models/Profile");
const User = require("../Models/User");
const { matchCollege } = require("../data/aktuColleges");

const SCORE_FORMULA = Object.freeze({ leetcodeLifetimeCap: 500, leetcodeLifetimePoints: 400, githubLifetimeCap: 1000, githubLifetimePoints: 250, streakCap: 60, streakPoints: 150, leetcodeTodayCap: 10, leetcodeTodayPoints: 100, githubTodayCap: 20, githubTodayPoints: 100 });
function indiaDate() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function activity(profile) { const today = indiaDate(); const days = Array.isArray(profile.activityCalendar) ? profile.activityCalendar : []; return { githubTotal: days.reduce((sum, day) => sum + (Number(day.github) || 0), 0), githubToday: days.filter((day) => day.date === today).reduce((sum, day) => sum + (Number(day.github) || 0), 0), leetcodeToday: days.filter((day) => day.date === today).reduce((sum, day) => sum + (Number(day.leetcode) || 0), 0) }; }
const capped = (value, cap, points) => Math.min(Math.max(Number(value) || 0, 0), cap) / cap * points;
function calculateLeaderboardScore(profile) { const current = activity(profile); return Math.round(capped(profile.leetcodeStats?.totalSolved, 500, 400) + capped(current.githubTotal, 1000, 250) + capped(profile.currentStreak, 60, 150) + capped(current.leetcodeToday, 10, 100) + capped(current.githubToday, 20, 100)); }
function buildLeaderboardEntry(profile, user) { const current = activity(profile); return { userId: String(profile.userId), name: user.name, avatar: profile.avatarUrl || user.avatarUrl || "", college: profile.collegeName || profile.college || "", branch: profile.branch || "", score: calculateLeaderboardScore(profile), leetcode: profile.leetcodeUsername ? { connected: true, totalSolved: Number(profile.leetcodeStats?.totalSolved) || 0, today: current.leetcodeToday, todayLabel: "submissions today" } : { connected: false }, github: profile.githubUsername ? { connected: true, totalContributions: current.githubTotal, today: current.githubToday } : { connected: false }, streak: Number(profile.currentStreak) || 0, lastSyncedAt: profile.lastSyncedAt || null }; }
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
  if (scope === "college" && !mine?.collegeId) return { scope, needsCollege: true, college: null, currentUser: null, users: [] };
  const query = { onboardingCompleted: true, ...(scope === "college" ? { collegeId: mine.collegeId } : {}) };
  const profiles = await Profile.find(query).lean();
  const users = await User.find({ _id: { $in: profiles.map((profile) => profile.userId) } }).select("name avatarUrl").lean();
  const byId = new Map(users.map((user) => [String(user._id), user]));
  const ranked = profiles.map((profile) => byId.has(String(profile.userId)) ? buildLeaderboardEntry(profile, byId.get(String(profile.userId))) : null).filter(Boolean).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).map((entry, index) => ({ ...entry, rank: index + 1 }));
  const current = ranked.find((entry) => entry.userId === String(userId));
  const visible = search ? ranked.filter((entry) => `${entry.name} ${entry.branch}`.toLowerCase().includes(search.toLowerCase())) : ranked;
  return { scope, needsCollege: false, college: scope === "college" ? { id: mine.collegeId, name: mine.collegeName || mine.college } : null, currentUser: current ? { rank: current.rank, score: current.score, gapToNext: current.rank > 1 ? ranked[current.rank - 2].score - current.score : 0 } : null, users: visible };
}
module.exports = { SCORE_FORMULA, calculateLeaderboardScore, buildLeaderboardEntry, getLeaderboard };
