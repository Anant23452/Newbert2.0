const test = require("node:test");
const assert = require("node:assert/strict");
const { validateStudyUpdate, serializeStudyRecord } = require("../services/studyProgressService");
const key = "lecture:dbms:CbtTp6n_Q7A";
test("legacy units retain bookmark and completion support", () => {
  assert.equal(validateStudyUpdate({ key: "electrical:sem1:bee:2", saved: true }).fields.saved, true);
  assert.throws(() => validateStudyUpdate({ key: "invalid" }));
  assert.throws(() => validateStudyUpdate({ key, completed: "true" }));
});
test("timestamp notes are bounded and do not accept unknown fields", () => {
  const note = { id: "a", text: "Explain keys", seconds: 65.4, kind: "question", resolved: false, userId: "someone-else" };
  const result = validateStudyUpdate({ key, notes: [note], userId: "someone-else", positionSeconds: 70 });
  assert.equal(result.fields.notes[0].seconds, 65);
  assert.equal(result.fields.notes[0].userId, undefined);
  assert.equal(result.fields.userId, undefined);
  assert.throws(() => validateStudyUpdate({ key, notes: [note, note] }));
  assert.throws(() => validateStudyUpdate({ key, positionSeconds: Infinity }));
  assert.throws(() => validateStudyUpdate({ key, notes: [{ ...note, text: "x".repeat(1501) }] }));
});
test("review scheduling changes only on an explicit confidence rating", () => {
  const now = new Date("2026-09-11T00:00:00Z");
  assert.equal(validateStudyUpdate({ key, confidence: "good" }, now).fields.reviewAt.toISOString(), "2026-09-14T00:00:00.000Z");
  assert.equal(validateStudyUpdate({ key, positionSeconds: 80 }, now).fields.reviewAt, undefined);
  assert.throws(() => validateStudyUpdate({ key, confidence: "master" }));
});
test("serialization exposes only study fields", () => {
  const result = serializeStudyRecord({ key, userId: "secret", notes: [] });
  assert.equal(result.userId, undefined);
  assert.deepEqual(result.notes, []);
});
