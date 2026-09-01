const test = require("node:test");
const assert = require("node:assert/strict");

const {
  kolkataDate,
  getKolkataToday,
  getKolkataDayOffset,
  getDatesForRange,
  isSameDayIST,
} = require("../utils/dateNormalization");
const { calculateStreaks, mergeActivity } = require("../Controllers/profileController");
const {
  activityMetrics,
  buildLeaderboardEntry,
  rankEntries,
  getDatesForRange: serviceGetDates,
} = require("../services/leaderboardService");
const { serializePublicProfile } = require("../services/publicProfileService");

// ─────────────────────────────────────────────────────────────────────────────
// 1. DATE / TIMEZONE NORMALIZATION (IST, UTC+5:30)
// ─────────────────────────────────────────────────────────────────────────────

test("kolkataDate accurately normalizes UTC timestamps across midnight boundary into IST", () => {
  // 1 September 2026 at 18:00 UTC is 1 September 2026 at 23:30 IST
  const sep1NightUtc = "2026-09-01T18:00:00Z";
  assert.equal(kolkataDate(sep1NightUtc), "2026-09-01");

  // 1 September 2026 at 18:45 UTC is 2 September 2026 at 00:15 IST (Next Day in India)
  const sep2EarlyMorningUtc = "2026-09-01T18:45:00Z";
  assert.equal(kolkataDate(sep2EarlyMorningUtc), "2026-09-02");

  // 2 September 2026 at 08:30 UTC is 2 September 2026 at 14:00 IST
  const sep2AfternoonUtc = "2026-09-02T08:30:00Z";
  assert.equal(kolkataDate(sep2AfternoonUtc), "2026-09-02");
});

test("isSameDayIST identifies same calendar day irrespective of UTC difference", () => {
  const t1 = "2026-09-01T19:00:00Z"; // Sep 2, 00:30 IST
  const t2 = "2026-09-02T05:00:00Z"; // Sep 2, 10:30 IST
  assert.ok(isSameDayIST(t1, t2));
});

test("getDatesForRange generates correct IST calendar windows", () => {
  const base = new Date("2026-09-02T10:00:00+05:30");
  const todayRange = getDatesForRange("today", base);
  assert.equal(todayRange.size, 1);
  assert.ok(todayRange.has("2026-09-02"));

  const sevenDays = getDatesForRange("7d", base);
  assert.equal(sevenDays.size, 7);
  assert.ok(sevenDays.has("2026-09-02"));
  assert.ok(sevenDays.has("2026-09-01"));
  assert.ok(sevenDays.has("2026-08-27"));
  assert.ok(!sevenDays.has("2026-08-26"));

  const thirtyDays = getDatesForRange("30d", base);
  assert.equal(thirtyDays.size, 30);
  assert.ok(thirtyDays.has("2026-09-02"));
  assert.ok(thirtyDays.has("2026-08-04"));
  assert.ok(!thirtyDays.has("2026-08-03"));

  const allTime = getDatesForRange("overall", base);
  assert.equal(allTime, null);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GITHUB ACTIVITY MERGE & RECENT ACTIVITY (SEP 1 & SEP 2)
// ─────────────────────────────────────────────────────────────────────────────

test("mergeActivity correctly preserves 9 commits on Sep 1 and 1 commit on Sep 2", () => {
  const githubActivity = [
    { date: "2026-09-01", count: 9, commits: 9 },
    { date: "2026-09-02", count: 1, commits: 1 },
  ];
  const leetcodeActivity = [
    { date: "2026-09-01", count: 2, acceptedProblems: ["two-sum", "reverse-linked-list"] },
  ];

  const merged = mergeActivity(githubActivity, leetcodeActivity);
  assert.equal(merged.length, 2);

  const sep1 = merged.find((d) => d.date === "2026-09-01");
  assert.ok(sep1);
  assert.equal(sep1.github, 9);
  assert.equal(sep1.githubCommits, 9);
  assert.equal(sep1.leetcode, 2);
  assert.equal(sep1.total, 11);

  const sep2 = merged.find((d) => d.date === "2026-09-02");
  assert.ok(sep2);
  assert.equal(sep2.github, 1);
  assert.equal(sep2.githubCommits, 1);
  assert.equal(sep2.total, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. STREAK CALCULATION FAIRNESS (COUNT DAYS, NOT NUMBER OF COMMITS)
// ─────────────────────────────────────────────────────────────────────────────

test("calculateStreaks: 9 commits on Sep 1 + 1 commit on Sep 2 equals 2 streak days, not 10", () => {
  const activity = [
    { date: "2026-09-01", github: 9, githubCommits: 9, total: 9 },
    { date: "2026-09-02", github: 1, githubCommits: 1, total: 1 },
  ];

  const { currentStreak, longestStreak } = calculateStreaks(activity);
  assert.equal(currentStreak, 2, "Current streak should be 2 consecutive calendar days");
  assert.equal(longestStreak, 2, "Longest streak should be 2 consecutive calendar days");
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. USER OWNERSHIP & DATA ISOLATION (DILEEP YADAV VS ANANT)
// ─────────────────────────────────────────────────────────────────────────────

test("User ownership: Anant and Dileep Yadav receive distinct activity data with zero cross-user leakage", () => {
  const userAnant = { _id: "user-anant-001", name: "Anant Sharma", avatarUrl: "" };
  const profileAnant = {
    userId: userAnant._id,
    githubUsername: "anantsharma",
    currentStreak: 5,
    longestStreak: 12,
    activityCalendar: [
      { date: "2026-09-01", github: 9, githubCommits: 9, total: 9 },
      { date: "2026-09-02", github: 1, githubCommits: 1, total: 1 },
    ],
    privacy: { profileVisibility: "public", sections: { github: true, streakStats: true, leaderboardRank: true } },
  };

  const userDileep = { _id: "user-dileep-002", name: "Dileep Yadav", avatarUrl: "" };
  const profileDileep = {
    userId: userDileep._id,
    githubUsername: "dileepyadav",
    currentStreak: 1,
    longestStreak: 4,
    activityCalendar: [
      { date: "2026-08-30", github: 3, githubCommits: 3, total: 3 },
    ],
    privacy: { profileVisibility: "public", sections: { github: true, streakStats: true, leaderboardRank: true } },
  };

  const entryAnant = buildLeaderboardEntry(profileAnant, userAnant);
  const entryDileep = buildLeaderboardEntry(profileDileep, userDileep);

  assert.notEqual(entryAnant.userId, entryDileep.userId);
  assert.equal(entryAnant.github.today, 1);
  assert.equal(entryAnant.github["7d"], 10);
  assert.equal(entryAnant.streak.current, 5);

  assert.equal(entryDileep.github.today, 0);
  assert.equal(entryDileep.github["7d"], 3);
  assert.equal(entryDileep.streak.current, 1);

  // Verify Dileep cannot access Anant's activity via public serialization
  const publicDileep = serializePublicProfile(profileDileep, userDileep, null);
  assert.equal(publicDileep.name, "Dileep Yadav");
  assert.equal(publicDileep.activityCalendar.length, 1);
  assert.equal(publicDileep.activityCalendar[0].date, "2026-08-30");
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. LEADERBOARD RANKING & TIE BREAKING
// ─────────────────────────────────────────────────────────────────────────────

test("Leaderboard rankEntries sorts by metric descending with tie breaking by recent activity date", () => {
  const entries = [
    { userId: "u3", name: "Rahul", score: 10, lastActivityDate: "2026-09-01", branch: "CSE" },
    { userId: "u1", name: "Anant", score: 25, lastActivityDate: "2026-09-02", branch: "IT" },
    { userId: "u2", name: "Dileep", score: 10, lastActivityDate: "2026-09-02", branch: "CSE" }, // More recent than Rahul
  ];

  const { users } = rankEntries(entries, (e) => e.score, "u1");
  assert.equal(users[0].userId, "u1");
  assert.equal(users[0].rank, 1);

  // Between Dileep and Rahul (both score 10), Dileep has more recent activity (2026-09-02 > 2026-09-01)
  assert.equal(users[1].userId, "u2");
  assert.equal(users[1].rank, 2);

  assert.equal(users[2].userId, "u3");
  assert.equal(users[2].rank, 3);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. LEADERBOARD TIME-RANGE AGGREGATION (TODAY / 7D / 30D / OVERALL)
// ─────────────────────────────────────────────────────────────────────────────

test("activityMetrics computes exact counts for Today, 7D, 30D, and Overall", () => {
  const profile = {
    activityCalendar: [
      { date: getKolkataToday(), github: 1, githubCommits: 1, leetcode: 2, leetcodeAcceptedProblems: ["p1", "p2"], total: 3 },
      { date: getKolkataDayOffset(-1), github: 9, githubCommits: 9, leetcode: 1, leetcodeAcceptedProblems: ["p3"], total: 10 },
      { date: getKolkataDayOffset(-10), github: 4, githubCommits: 4, leetcode: 0, total: 4 },
      { date: getKolkataDayOffset(-40), github: 20, githubCommits: 20, leetcode: 5, total: 25 },
    ],
  };

  const metrics = activityMetrics(profile);
  assert.equal(metrics.today.github, 1, "Today should have 1 commit");
  assert.equal(metrics.today.leetcode, 2, "Today should have 2 leetcode problems");

  assert.equal(metrics["7d"].github, 10, "7 Days should have 1 + 9 = 10 commits");
  assert.equal(metrics["7d"].leetcode, 3, "7 Days should have 2 + 1 = 3 unique problems");

  assert.equal(metrics["30d"].github, 14, "30 Days should have 1 + 9 + 4 = 14 commits");
  assert.equal(metrics.githubContributions, 34, "Overall should have all 34 commits/contributions");
});
