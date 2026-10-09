const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildAudiencePreview } = require('../services/alumniJourneySummary');
const { serializePublicAlumni } = require('../services/alumniPublicService');

test('summary uses approved facts and respects private and college-only sections', () => {
  const story = { name: 'Senior', college: { name: 'College', collegeId: 'college' }, graduationYear: 2025,
    placement: { company: 'Private company', role: 'Engineer', ctc: 25 },
    skillsAtSelection: [{ name: 'Private skill' }], projects: [{ name: 'College project' }],
    preparation: { months: 8 }, advice: 'Practise explaining your work.',
    privacy: { placement: 'PRIVATE', skillsAtSelection: 'PRIVATE', projects: 'COLLEGE_ONLY' } };
  const publicView = buildAudiencePreview(story);
  assert.match(publicView.journeySummary, /8 months/);
  assert(!publicView.journeySummary.includes('Private company'));
  assert(!publicView.journeySummary.includes('Private skill'));
  assert(!publicView.journeySummary.includes('College project'));
  assert.match(buildAudiencePreview(story, true).journeySummary, /College project/);
  const record = { _id: 'record', onboardingVersion: 1, story, privacy: story.privacy, collegeId: 'college', verified: false };
  assert.equal(serializePublicAlumni(record).journeySummary, publicView.journeySummary);
  assert(!JSON.stringify(serializePublicAlumni(record)).includes('Private company'));
});

test('sparse stories do not invent offers, projects, preparation or verification', () => {
  const summary = buildAudiencePreview({ advice: 'Keep practising.' }).journeySummary;
  assert.equal(summary, 'Their advice: Keep practising.');
  assert.equal(buildAudiencePreview({}).journeySummary, '');
});
