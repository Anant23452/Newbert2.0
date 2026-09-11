import test from "node:test";
import assert from "node:assert/strict";
import { recommendTask, planTotals, deadlineLabel, restoreSession } from "./todayPersonalization.js";

test("time suggestions use real estimates and retain a useful fallback", () => {
  const tasks = [{ id: "long", estimatedMinutes: 60 }, { id: "short", estimatedMinutes: 15 }];
  assert.equal(recommendTask(tasks, 25).id, "short");
  assert.equal(recommendTask(tasks, 10).id, "long");
  assert.equal(recommendTask([], 25), undefined);
  assert.equal(recommendTask([{ id: "unknown" }, ...tasks], 25).id, "short");
});
test("plan progress measures task completion, including plans with no tasks", () => {
  assert.deepEqual(planTotals([]), { completed: 0, total: 0 });
  assert.deepEqual(planTotals([{ completed: 2, total: 5 }, { completed: 0, total: 0 }]), { completed: 2, total: 5 });
});
test("deadline urgency handles expired and sub-hour dates without saying zero hours", () => {
  const now = Date.parse("2026-09-11T10:00:00Z");
  assert.equal(deadlineLabel("2026-09-11T10:20:00Z", now), "Less than 1 hour");
  assert.equal(deadlineLabel("2026-09-11T09:00:00Z", now), "Deadline passed");
  assert.equal(deadlineLabel("invalid", now), "Check deadline");
});
test("focus sessions resume elapsed wall time and finish while closed", () => {
  const result = restoreSession({ minutes: 25, remaining: 1500, running: true, deadline: Date.now() + 59000 }, 15);
  assert.ok(result.remaining >= 58 && result.remaining <= 59);
  assert.equal(result.running, true);
  assert.equal(restoreSession({ minutes: 25, remaining: 1500, running: true, deadline: Date.now() - 1 }, 15).running, false);
});
test("invalid saved timers reset safely while paused timers retain their time", () => {
  assert.equal(restoreSession({ minutes: 25, remaining: -1 }, 15).remaining, 900);
  assert.equal(restoreSession({ minutes: 25, remaining: 150, running: false, deadline: 0 }, 15).remaining, 150);
  assert.equal(restoreSession({ minutes: 25, remaining: 150, running: true }, 15).remaining, 900);
});
