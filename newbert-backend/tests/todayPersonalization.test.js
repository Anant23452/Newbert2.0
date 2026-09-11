const test = require("node:test");
const assert = require("node:assert/strict");
const { buildTodaySummary } = require("../services/todayService");

test("time suggestions never jump over earlier unfinished tasks within a plan", () => {
  const result = buildTodaySummary({ plans: [
    { _id: "sql", skillName: "SQL", status: "in_progress", tasks: [{ id: "later", order: 2, estimatedMinutes: 15 }, { id: "first", order: 1, estimatedMinutes: 45 }] },
    { _id: "web", skillName: "Web", status: "in_progress", tasks: [{ id: "done", order: 1, completed: true }, { id: "next", order: 2 }] },
    { _id: "review", status: "evidence_submitted", tasks: [{ id: "hidden", order: 1 }] },
    { _id: "verified", status: "verified", tasks: [{ id: "hidden", order: 1 }] },
  ] });
  assert.deepEqual(result.nextActions.map((task) => task.id), ["first", "next"]);
  assert.deepEqual(result.planProgress[1], { id: "web", skillName: "Web", status: "in_progress", completed: 1, total: 2 });
});
test("empty profiles have no invented progress or suggested tasks", () => {
  const result = buildTodaySummary({ plans: [{ _id: "empty", skillName: "SQL", status: "not_started" }] });
  assert.deepEqual(result.nextActions, []);
  assert.equal(result.planProgress[0].total, 0);
  assert.equal(result.planProgress[0].completed, 0);
});
