const test = require("node:test");
const assert = require("node:assert/strict");
const { serializePublicProfile } = require("../services/publicProfileService");
const { buildLeaderboardEntry } = require("../services/leaderboardService");
const { calculateStreaks } = require("../Controllers/profileController");

const user = { _id: "507f1f77bcf86cd799439011", name: "Test Student", avatarUrl: "" };

function profile(overrides = {}) {
  return {
    userId: user._id,
    githubUsername: "octocat",
    leetcodeUsername: "student",
    linkedinUrl: "https://linkedin.com/in/student",
    githubStats: { username: "octocat", publicRepos: 2 },
    leetcodeStats: { username: "student", totalSolved: 20 },
    activityCalendar: [{ date: "2026-08-30", github: 4, leetcode: 3, total: 7 }],
    currentStreak: 3,
    longestStreak: 8,
    privacy: { profileVisibility: "public", sections: {} },
    ...overrides,
  };
}

test("private public profile does not expose streak, links, or daily activity", () => {
  const result = serializePublicProfile(profile({ privacy: { profileVisibility: "private", sections: {} } }), user, null, { visible: true });
  assert.equal(result.private, true);
  assert.equal(result.leaderboard.streakDays, undefined);
  assert.equal(result.activityCalendar, undefined);
  assert.equal(result.linkedin, undefined);
  assert.equal(result.streakLeaderboard, undefined);
});

test("private heatmap keeps public streak totals but hides exact dates", () => {
  const result = serializePublicProfile(profile({ privacy: { profileVisibility: "public", sections: { activityHeatmap: false } } }), user, null, { visible: true });
  assert.equal(result.leaderboard.streakDays, 3);
  assert.equal(result.activityPrivacy.heatmapVisible, false);
  assert.equal(result.activityCalendar, undefined);
});

test("hidden GitHub section removes GitHub counts from public activity", () => {
  const result = serializePublicProfile(profile({ privacy: { profileVisibility: "public", sections: { github: false, leetcode: true } } }), user);
  assert.equal(result.github, undefined);
  assert.deepEqual(result.activityCalendar, [{ date: "2026-08-30", github: 0, leetcode: 3, total: 3 }]);
});

test("leaderboard entry hides private platform and private streak metrics", () => {
  const entry = buildLeaderboardEntry(profile({ privacy: { profileVisibility: "public", sections: { github: false, leetcode: true, streakStats: false } } }), user);
  assert.equal(entry.github.connected, false);
  assert.equal(entry.leetcode.connected, true);
  assert.equal(entry.streak.private, true);
});

test("current streak keeps yesterday's run while today is incomplete", () => {
  const indiaDate = (offset) => {
    const date = new Date(Date.now() + offset * 86400000);
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  };
  const activity = [-3, -2, -1].map((offset) => ({ date: indiaDate(offset), github: 1, leetcode: 0, total: 1 }));
  assert.equal(calculateStreaks(activity).currentStreak, 3);
});

