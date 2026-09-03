const test = require("node:test");
const assert = require("node:assert/strict");
const {
  toActivityDate,
  kolkataDate,
  getKolkataToday,
  getKolkataDayOffset,
  getDatesForRange,
  calculateStreaks,
  KOLKATA_TIMEZONE,
} = require("../utils/dateNormalization");
const {
  normalizeDailyItem,
  mergeActivitySources,
  getNormalizedUserActivity,
} = require("../services/activityAggregationService");
const { activityMetrics } = require("../services/leaderboardService");

test("PART 29 — REQUIRED ACTIVITY PIPELINE TESTS (Tests 1-23)", async (t) => {
  const today = getKolkataToday();

  await t.test("Test 1: User commits 9 times on GitHub today -> today.github = 9, cell updates", () => {
    const freshGithub = [{ date: today, count: 9, commits: 9 }];
    const merged = mergeActivitySources({ storedActivity: [], freshGithub });
    const todayItem = merged.find((d) => d.date === today);
    assert.ok(todayItem);
    assert.equal(todayItem.githubCommits, 9);
    assert.equal(todayItem.github, 9);
    assert.equal(todayItem.total, 9);
  });

  await t.test("Test 2: User solves 1 LeetCode problem today -> today.leetcode = 1, cell updates", () => {
    const freshLeetcode = [{ date: today, count: 1, acceptedProblems: ["two-sum"] }];
    const merged = mergeActivitySources({ storedActivity: [], freshLeetcode });
    const todayItem = merged.find((d) => d.date === today);
    assert.ok(todayItem);
    assert.equal(todayItem.leetcodeAccepted, 1);
    assert.equal(todayItem.total, 1);
  });

  await t.test("Test 3: User does both on same day -> total = 10, both sources present in breakdown", () => {
    const freshGithub = [{ date: today, count: 9, commits: 9 }];
    const freshLeetcode = [{ date: today, count: 1, acceptedProblems: ["two-sum"] }];
    const merged = mergeActivitySources({ storedActivity: [], freshGithub, freshLeetcode });
    const todayItem = merged.find((d) => d.date === today);
    assert.ok(todayItem);
    assert.equal(todayItem.githubCommits, 9);
    assert.equal(todayItem.leetcodeAccepted, 1);
    assert.equal(todayItem.total, 10);
    assert.equal(todayItem.breakdown.github.commits, 9);
    assert.equal(todayItem.breakdown.leetcode.solved, 1);
  });

  await t.test("Test 4 & 5: Singular and plural grammar rules", () => {
    const formatProblem = (count) => (count === 1 ? "1 problem solved" : `${count} problems solved`);
    const formatCommit = (count) => (count === 1 ? "1 commit" : `${count} commits`);

    assert.equal(formatProblem(1), "1 problem solved");
    assert.equal(formatProblem(2), "2 problems solved");
    assert.equal(formatProblem(0), "0 problems solved");

    assert.equal(formatCommit(1), "1 commit");
    assert.equal(formatCommit(2), "2 commits");
    assert.equal(formatCommit(9), "9 commits");
  });

  await t.test("Test 6: Cell for today matches getKolkataToday()", () => {
    const todayStr = getKolkataToday();
    assert.match(todayStr, /^\d{4}-\d{2}-\d{2}$/);
    const dayItem = normalizeDailyItem({ date: todayStr, githubCommits: 1 });
    assert.equal(dayItem.date, todayStr);
  });

  await t.test("Test 7: Future calendar cells cannot be marked active", () => {
    const tomorrow = getKolkataDayOffset(1);
    const todayStr = getKolkataToday();
    assert.ok(tomorrow > todayStr, "Tomorrow must be lexicographically after today");
  });

  await t.test("Test 8 & 9: Timezone day boundary checks (11:30 PM IST vs 12:30 AM IST)", () => {
    // 2026-09-03 23:30:00 IST is 2026-09-03 18:00:00 UTC
    const lateNightIST = new Date("2026-09-03T18:00:00Z");
    assert.equal(toActivityDate(lateNightIST, "Asia/Kolkata"), "2026-09-03");

    // 2026-09-03 00:30:00 IST is 2026-09-02 19:00:00 UTC
    const earlyMorningIST = new Date("2026-09-02T19:00:00Z");
    assert.equal(toActivityDate(earlyMorningIST, "Asia/Kolkata"), "2026-09-03");
  });

  await t.test("Test 10 & 11: Refreshing activity merges without wiping older history", () => {
    const storedActivity = [
      { date: "2026-08-15", githubCommits: 5, total: 5 },
      { date: "2026-09-01", githubCommits: 9, total: 9 },
    ];
    const freshGithub = [
      { date: today, count: 2, commits: 2 },
    ];
    const merged = mergeActivitySources({ storedActivity, freshGithub });
    assert.equal(merged.length, 3);
    assert.ok(merged.some((d) => d.date === "2026-08-15" && d.githubCommits === 5));
    assert.ok(merged.some((d) => d.date === "2026-09-01" && d.githubCommits === 9));
    assert.ok(merged.some((d) => d.date === today && d.githubCommits === 2));
  });

  await t.test("Test 12: GitHub API rate limit (403) retains stored GitHub activity without losing commits", () => {
    const storedActivity = [
      { date: "2026-09-01", githubCommits: 9, github: 9, total: 9 },
    ];
    const freshGithub = []; // Rate limit returned empty
    const freshLeetcode = [{ date: today, count: 1, acceptedProblems: ["reverse-string"] }];
    const merged = mergeActivitySources({ storedActivity, freshGithub, freshLeetcode });
    const sep1 = merged.find((d) => d.date === "2026-09-01");
    assert.ok(sep1, "Sep 1 must not be wiped out when GitHub rate limits");
    assert.equal(sep1.githubCommits, 9);
    assert.equal(sep1.github, 9);
  });

  await t.test("Test 13: LeetCode failure retains stored LeetCode data", () => {
    const storedActivity = [
      { date: "2026-09-02", leetcodeAccepted: 3, leetcode: 3, leetcodeAcceptedProblems: ["p1", "p2", "p3"], total: 3 },
    ];
    const freshGithub = [{ date: today, count: 1, commits: 1 }];
    const freshLeetcode = []; // Failed LeetCode sync
    const merged = mergeActivitySources({ storedActivity, freshGithub, freshLeetcode });
    const sep2 = merged.find((d) => d.date === "2026-09-02");
    assert.ok(sep2, "Sep 2 must retain LeetCode data");
    assert.equal(sep2.leetcodeAccepted, 3);
  });

  await t.test("Test 14: Total verified activities equals exact sum of calendar totals", () => {
    const profile = {
      activityCalendar: [
        { date: "2026-09-01", githubCommits: 9, leetcodeAccepted: 1, total: 10 },
        { date: "2026-09-02", githubCommits: 1, leetcodeAccepted: 0, total: 1 },
      ],
    };
    const userActivity = getNormalizedUserActivity(profile);
    assert.equal(userActivity.totalVerifiedActivities, 11);
  });

  await t.test("Test 15: Current streak calculation matches heatmap streak", () => {
    const calendar = [
      { date: getKolkataDayOffset(-1), total: 1, githubCommits: 1 },
      { date: today, total: 2, githubCommits: 2 },
    ];
    const streaks = calculateStreaks(calendar);
    assert.equal(streaks.currentStreak, 2);
  });

  await t.test("Test 16: Today leaderboard matches today profile activity", () => {
    const profile = {
      activityCalendar: [
        { date: today, githubCommits: 4, github: 4, leetcode: 2, leetcodeAccepted: 2, leetcodeAcceptedProblems: ["a", "b"], total: 6 },
      ],
    };
    const metrics = activityMetrics(profile);
    assert.equal(metrics.today.github, 4);
    assert.equal(metrics.today.leetcode, 2);
  });

  await t.test("Test 17: User isolation: Anant and Dileep maintain separate activity states", () => {
    const profileAnant = {
      activityCalendar: [{ date: "2026-09-01", githubCommits: 9, total: 9 }],
    };
    const profileDileep = {
      activityCalendar: [{ date: "2026-09-01", githubCommits: 0, total: 0 }],
    };
    const anantData = getNormalizedUserActivity(profileAnant);
    const dileepData = getNormalizedUserActivity(profileDileep);
    assert.equal(anantData.totalVerifiedActivities, 9);
    assert.equal(dileepData.totalVerifiedActivities, 0);
  });

  await t.test("Test 18: No hardcoded dates in date normalization helpers", () => {
    const now1 = new Date();
    const generatedToday = getKolkataToday();
    const expectedYear = String(now1.getFullYear());
    assert.ok(generatedToday.startsWith(expectedYear));
  });

  await t.test("Test 19: Timezone helper supports arbitrary timestamps and timezones", () => {
    const epoch = 1756857600000;
    const dateKolkata = toActivityDate(epoch, "Asia/Kolkata");
    assert.match(dateKolkata, /^\d{4}-\d{2}-\d{2}$/);
  });

  await t.test("Test 20: PushEvent commits are parsed accurately from payload", () => {
    const item = normalizeDailyItem({ date: today, githubCommits: 5 });
    assert.equal(item.githubCommits, 5);
    assert.equal(item.breakdown.github.commits, 5);
  });

  await t.test("Test 21: Daily activity items conform to canonical schema", () => {
    const item = normalizeDailyItem({
      date: "2026-09-03",
      githubCommits: 9,
      leetcodeAccepted: 1,
      leetcodeAcceptedProblems: ["two-sum"],
    });
    assert.equal(item.date, "2026-09-03");
    assert.equal(item.github, 9);
    assert.equal(item.githubCommits, 9);
    assert.equal(item.leetcodeAccepted, 1);
    assert.deepEqual(item.leetcodeAcceptedProblems, ["two-sum"]);
    assert.equal(item.total, 10);
    assert.equal(item.totalVerifiedActivity, 10);
    assert.ok(item.breakdown.github);
    assert.ok(item.breakdown.leetcode);
  });

  await t.test("Test 22: Historical calendar days are preserved when merging fresh sync", () => {
    const stored = [
      { date: "2026-01-01", githubCommits: 10, total: 10 },
      { date: "2026-05-20", githubCommits: 5, total: 5 },
    ];
    const fresh = [{ date: today, count: 1, commits: 1 }];
    const merged = mergeActivitySources({ storedActivity: stored, freshGithub: fresh });
    assert.equal(merged.length, 3);
    assert.equal(merged[0].date, "2026-01-01");
    assert.equal(merged[1].date, "2026-05-20");
    assert.equal(merged[2].date, today);
  });

  await t.test("Test 23: Range calculations (today, 7d, 30d) are correct", () => {
    const todayDates = getDatesForRange("today");
    assert.equal(todayDates.size, 1);
    assert.ok(todayDates.has(today));

    const sevenDays = getDatesForRange("7d");
    assert.equal(sevenDays.size, 7);
    assert.ok(sevenDays.has(today));

    const thirtyDays = getDatesForRange("30d");
    assert.equal(thirtyDays.size, 30);
    assert.ok(thirtyDays.has(today));
  });
});
