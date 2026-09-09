import test from "node:test";
import assert from "node:assert/strict";
import { activityWeek } from "./todayActivity.js";

test("activity week respects India's date boundary and year rollover", () => {
  const days = activityWeek([], new Date("2026-12-31T19:00:00Z"));
  assert.equal(days.length, 7);
  assert.equal(days[0].key, "2026-12-26");
  assert.equal(days[6].key, "2027-01-01");
});

test("activity uses normalized provider counts, not generic or manual totals", () => {
  const days = activityWeek([{ date: "2026-09-09", githubCommits: 9, leetcodeAccepted: 3, total: 9999 }], new Date("2026-09-09T12:00:00Z"));
  assert.deepEqual([days[6].github, days[6].leetcode, days[6].total], [9, 3, 12]);
  assert.equal(days[5].recorded, false);
  assert.equal(days[6].recorded, true);
});

test("empty and partial provider data do not fabricate activity", () => {
  assert.equal(activityWeek(null).every((day) => day.total === 0), true);
  const days = activityWeek([{ date: "2026-09-09", githubCommits: -2, leetcodeAccepted: 3 }], new Date("2026-09-09T12:00:00Z"));
  assert.equal(days[6].total, 3);
});
