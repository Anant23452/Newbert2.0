import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readResumeText, interviewGuidance } from './alumniInterview.js';
test('text resume reading preserves original wording and rejects unsuitable inputs', async () => {
  const original = 'My project uses React. I implemented the API and deployment. Contact information can be removed before submission.';
  assert.equal(await readResumeText({ name: 'resume.txt', size: 100, text: async () => original }), original);
  await assert.rejects(readResumeText({ name: 'resume.exe', size: 100 }), /PDF or .txt/);
  await assert.rejects(readResumeText({ name: 'resume.txt', size: 6000000 }), /5 MB/);
  await assert.rejects(readResumeText({ name: 'resume.txt', size: 5, text: async () => '' }), /No readable text/);
});
test('guidance distinguishes current skills from selection-time facts', () => {
  assert(interviewGuidance({ id: 'skillsAtSelection' }).some(line => line.includes('after selection')));
  assert(interviewGuidance({ id: 'projects' }).some(line => line.includes('personally')));
});
