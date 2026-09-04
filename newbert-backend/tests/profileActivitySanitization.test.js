const test = require("node:test");
const assert = require("node:assert/strict");
const { sanitizedActivity } = require("../Controllers/profileController");

test("GitHub activity remains visible when LeetCode is unavailable", () => {
  const activity = sanitizedActivity({
    activityCalendar: [{ date: "2026-09-03", githubCommits: 7, github: 7, total: 7 }],
  }, null);

  assert.deepEqual(activity.map(({ date, githubCommits, leetcodeAccepted, total }) => ({ date, githubCommits, leetcodeAccepted, total })), [
    { date: "2026-09-03", githubCommits: 7, leetcodeAccepted: 0, total: 7 },
  ]);
});
