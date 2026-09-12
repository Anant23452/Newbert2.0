const legacyKey = /^(electrical|civil|information-technology):sem[1-8]:[a-z0-9-]{1,60}:[1-5]$/;
const lectureKey = /^lecture:[a-z0-9-]{1,60}:[A-Za-z0-9_-]{11}$/;
const { resolveUnit } = require('./studyAssistantService');
const unitPattern = /^unit:(electrical|civil|information-technology):([a-z0-9-]{1,60}):([1-5])$/;
const notebookKey = { test(key) {
  if (typeof key !== 'string') return false;
  if (lectureKey.test(key)) return true;
  const parts = key.match(unitPattern);
  return Boolean(parts && resolveUnit(parts[1], parts[2], Number(parts[3])));
} };
const confidenceDays = { again: 0, good: 3, solid: 7 };
function validateStudyUpdate(body, now = new Date()) {
  const { key } = body;
  if (typeof key !== "string" || !(legacyKey.test(key) || notebookKey.test(key))) throw new Error("Choose a valid study unit or lecture.");
  const fields = { lastViewedAt: now };
  for (const field of ["completed", "saved"]) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== "boolean") throw new Error("Progress values must be true or false.");
      fields[field] = body[field];
    }
  }
  if (notebookKey.test(key)) {
    for (const field of ["positionSeconds", "durationSeconds"]) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== "number" || !Number.isFinite(body[field]) || body[field] < 0 || body[field] > 86400) throw new Error("Lecture time must be between 0 and 86400 seconds.");
        fields[field] = Math.round(body[field]);
      }
    }
    if (body.notes !== undefined) {
      if (!Array.isArray(body.notes) || body.notes.length > 80) throw new Error("Keep up to 80 notes per lecture.");
      const ids = new Set();
      fields.notes = body.notes.map((note) => {
        if (!note || typeof note.id !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(note.id) || ids.has(note.id) || typeof note.text !== "string" || !note.text.trim() || note.text.length > 1500 || !Number.isFinite(note.seconds) || note.seconds < 0 || note.seconds > 86400 || !["note", "question"].includes(note.kind) || typeof note.resolved !== "boolean") throw new Error("A timestamp note is invalid.");
        ids.add(note.id);
        return { id: note.id, text: note.text.trim(), seconds: Math.round(note.seconds), kind: note.kind, resolved: note.resolved };
      });
    }
    if (body.reflection !== undefined) {
      if (typeof body.reflection !== "string" || body.reflection.length > 6000) throw new Error("Keep your recall answer under 6000 characters.");
      fields.reflection = body.reflection;
    }
    if (body.confidence !== undefined) {
      if (!Object.hasOwn(confidenceDays, body.confidence)) throw new Error("Choose a valid recall rating.");
      fields.confidence = body.confidence;
      fields.reviewAt = new Date(now.getTime() + confidenceDays[body.confidence] * 86400000);
    }
  }
  return { key, fields };
}
function serializeStudyRecord(record) {
  return { key: record.key, completed: Boolean(record.completed), saved: Boolean(record.saved), lastViewedAt: record.lastViewedAt,
    ...(notebookKey.test(record.key) && { positionSeconds: record.positionSeconds || 0, durationSeconds: record.durationSeconds || 0, notes: record.notes || [], reflection: record.reflection || "", confidence: record.confidence || "", reviewAt: record.reviewAt || null }) };
}
module.exports = { validateStudyUpdate, serializeStudyRecord, lectureKey, notebookKey };
