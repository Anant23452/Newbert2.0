const test = require("node:test");
const assert = require("node:assert/strict");
const StudyProgress = require("../Models/StudyProgress");
const controller = require("../Controllers/studentHomeController");
const key = "lecture:dbms:CbtTp6n_Q7A";
const userId = "60d0fe4f5311236168a109ca";
function response() { return { code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }
function fail(error) { throw error; }

test("lecture reads are scoped to the authenticated account, ignoring a supplied user ID", async (t) => {
  let filter;
  t.mock.method(StudyProgress, "findOne", (query) => { filter = query; return { lean: async () => ({ key, userId, reflection: "My own answer" }) }; });
  const res = response();
  await controller.getLectureProgress({ auth: { id: userId }, query: { key, userId: "another-account" } }, res, fail);
  assert.deepEqual(filter, { userId, key });
  assert.equal(res.body.record.reflection, "My own answer");
  assert.equal(res.body.record.userId, undefined);
});
test("saving a lecture cannot override ownership and retains schema validation", async (t) => {
  let write;
  t.mock.method(StudyProgress, "findOneAndUpdate", async (...args) => { write = args; return { key, ...args[1].$set }; });
  const res = response();
  await controller.updateStudyProgress({ auth: { id: userId }, body: { key, userId: "another-account", completed: true, reflection: "An explanation" } }, res, fail);
  assert.deepEqual(write[0], { userId, key });
  assert.equal(write[1].$set.userId, undefined);
  assert.equal(write[2].runValidators, true);
  assert.equal(res.body.record.completed, true);
});
test("malformed lecture queries and invalid writes return 400 without a database query", async (t) => {
  const read = t.mock.method(StudyProgress, "findOne", () => { throw new Error("Must not read"); });
  const write = t.mock.method(StudyProgress, "findOneAndUpdate", () => { throw new Error("Must not write"); });
  const readRes = response(); const writeRes = response();
  await controller.getLectureProgress({ auth: { id: userId }, query: { key: { $ne: null } } }, readRes, fail);
  await controller.updateStudyProgress({ auth: { id: userId }, body: { key, notes: Array(81).fill({}) } }, writeRes, fail);
  assert.equal(readRes.code, 400); assert.equal(writeRes.code, 400);
  assert.equal(read.mock.callCount(), 0); assert.equal(write.mock.callCount(), 0);
});
test("progress overview does not select private notebook text", async (t) => {
  let filter; let projection;
  t.mock.method(StudyProgress, "find", (query) => { filter = query; return { select: (fields) => { projection = fields; return { lean: async () => [] }; } }; });
  await controller.getStudyProgress({ auth: { id: userId } }, response(), fail);
  assert.deepEqual(filter, { userId });
  assert.ok(projection.includes("positionSeconds"));
  assert.ok(!projection.includes("notes") && !projection.includes("reflection"));
});
test("Mongoose preserves timestamp notes and accepts records created before the new fields", () => {
  const old = new StudyProgress({ userId, key: "electrical:sem1:bee:2", saved: true });
  assert.equal(old.validateSync(), undefined); assert.equal(old.notes.length, 0);
  const lecture = new StudyProgress({ userId, key, notes: [{ id: "note-1", seconds: 34, text: "Candidate keys", kind: "note", resolved: false }] });
  assert.equal(lecture.validateSync(), undefined); assert.equal(lecture.notes[0].id, "note-1");
  assert.equal(lecture.notes[0]._id, undefined);
});
