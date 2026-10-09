const { test } = require('node:test');
const assert = require('node:assert/strict');
const { prepareIntake, confirmIntake, alumniYear, storyForReview } = require('../services/alumniIntakeService');
const engine = require('../services/alumniQuestionEngine');
const { buildPublication } = require('../services/alumniChatService');
const { serializePublicAlumni } = require('../services/alumniPublicService');
const { interviewQuestion } = require('../services/alumniInterviewQuestionService');

test('two membership categories and July India year boundary; students cannot import', async () => {
  assert.equal(alumniYear(2026, new Date('2026-06-30T12:00:00Z')), false);
  assert.equal(alumniYear(2026, new Date('2026-07-01T12:00:00Z')), true);
  await assert.rejects(prepareIntake({ memberType: 'STUDENT', graduationYear: 2020 }), /for alumni/);
  await assert.rejects(prepareIntake({ memberType: 'ALUMNI', graduationYear: 2099 }), /Current students/);
  await assert.rejects(prepareIntake({ memberType: 'ALUMNI', graduationYear: 2020 }, { graduationYear: 2099 }), /Current students/);
});
test('links and resume yield suggestions only; missing providers are non-blocking', async () => {
  const intake = await prepareIntake({ memberType: 'ALUMNI', graduationYear: 2020, linkedin: 'https://linkedin.com/in/senior', github: 'https://github.com/senior', leetcode: 'https://leetcode.com/u/senior/', resumeText: 'A resume background.' }, null, {
    repositories: async () => [{ name: 'Planner', url: 'https://github.com/senior/planner', language: 'JavaScript' }, { name: 'Secret', isPrivate: true }],
    leetcode: async () => ({ totalSolved: 400 }),
    extract: async () => ({ answer: { name: 'Suggested name', resumeBackground: 'Claims React project work.' } }),
  });
  assert.equal(intake.suggestions.name, 'Suggested name');
  assert.equal(intake.suggestions.skillsAtSelection, undefined);
  assert.equal(intake.sources.find(s => s.type === 'GitHub').repositories.length, 1);
  assert.equal(intake.sources.find(s => s.type === 'LeetCode').currentSolved, 400);
  const session = { answers: {}, rawAnswers: {}, skippedQuestions: [], intake };
  confirmIntake(session, { ...intake.suggestions, name: 'Corrected name', resumeBackground: 'Corrected project contribution.' });
  assert.equal(session.answers.name, 'Corrected name');
  assert.equal(session.answers.skillsAtSelection, undefined);
  assert.equal(session.intake.confirmedBackground, 'Corrected project contribution.');
  assert(!engine.state(session).questions.some(q => q.id === 'privacy'));
  const failed = await prepareIntake({ memberType: 'ALUMNI', graduationYear: 2020, github: 'github.com/senior' }, null, { repositories: async () => { throw new Error('offline'); } });
  assert.equal(failed.notes.length, 1);
});
test('intake rejects wrong-host links and repository links', async () => {
  await assert.rejects(prepareIntake({ memberType: 'ALUMNI', graduationYear: 2020, linkedin: 'https://evil.test/in/a' }), /LinkedIn/);
  await assert.rejects(prepareIntake({ memberType: 'ALUMNI', graduationYear: 2020, github: 'https://github.com/senior/project' }), /user profile/);
});
test('approved new stories publish all story fields without a privacy question or source document', () => {
  const session = { publicStory: true, answers: { name: 'Senior', college: { name: 'College', collegeId: 'college' }, branch: 'IT', graduationYear: 2020, degree: 'B.Tech', careerPath: 'PLACEMENT', placement: { company: 'Company', role: 'Engineer', ctc: 12 }, skillsAtSelection: [{ name: 'React' }], preparation: { startedIn: 'YEAR_3', months: 8 }, advice: 'Explain your project.' }, rawAnswers: { resumeIntake: 'Sensitive raw resume' }, skippedQuestions: [] };
  engine.reconcile(session);
  assert(engine.state(session).canPublish);
  const record = buildPublication(session, { name: 'College', collegeId: 'college', _id: '507f1f77bcf86cd799439011' });
  const result = serializePublicAlumni(record);
  assert.equal(result.package, 12);
  assert(!JSON.stringify(result).includes('Sensitive raw resume'));
  assert.equal(storyForReview(session).privacy['placement.ctc'], 'PUBLIC');
});
test('Gemini receives corrected background; fallback does not write or fabricate answers', async () => {
  const session = { answers: {}, skippedQuestions: [], intakeConfirmed: true, intake: { confirmedBackground: 'I personally built the API.', sources: [] } };
  const result = await interviewQuestion(session, 'projects', async ({ prompt }) => { assert(prompt.includes('I personally built the API.')); return JSON.stringify({ question: 'Which API decisions did you make?', prompts: ['Describe one decision.'] }); });
  assert.equal(result.source, 'gemini');
  assert.equal(session.answers.projects, undefined);
  const fallback = await interviewQuestion(session, 'projects', async () => { throw new Error('outage'); });
  assert.equal(fallback.source, 'questionnaire');
});
