import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStoryPayload } from './alumniPayload.js';

test('an older session response with omitted empty fields stays renderable', () => {
  const result = normalizeStoryPayload({ session: { id: 'draft', currentQuestion: { id: 'name', text: 'Name?' } } });
  assert.deepEqual(result.session.answers, {});
  assert.deepEqual(result.session.rawAnswers, {});
  assert.deepEqual(result.session.questions, []);
  assert.deepEqual(result.session.sections, []);
  assert.deepEqual(result.session.skippedQuestions, []);
  assert.equal(result.session.canPublish, false);
});

test('a missing session remains a welcome state', () => {
  const result = normalizeStoryPayload({ session: null });
  assert.equal(result.session, null);
  assert.deepEqual(result.privacyFields, []);
});
