const { test, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/alumniChatHarness');
const Profile = require('../Models/Profile');
const h = setup();
let server;
after(() => server?.close());
test('new guest flow persists intake, confirms imports and publishes public answers', async () => {
  server = h.app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let token, version;
  async function request(path, body) {
    const response = await fetch(`${base}/alumni-guest/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Alumni-Guest-Token': token } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify({ version, ...body }) }) });
    const data = await response.json();
    if (data.session) version = data.session.version;
    if (data.guestToken) token = data.guestToken;
    return { status: response.status, data };
  }
  await request('start', {});
  assert.equal((await request('intake', { memberType: 'STUDENT', graduationYear: 2020 })).status, 400);
  const imported = await request('intake', { memberType: 'ALUMNI', graduationYear: 2020 });
  assert.equal(imported.status, 200);
  assert.equal(imported.data.session.intakeConfirmed, false);
  const confirmed = await request('confirm-intake', { values: imported.data.session.intake.suggestions });
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.data.session.publicStory, true);
  assert(!confirmed.data.session.questions.some(q => q.id === 'privacy'));
  const resumed = await request('session');
  assert.equal(resumed.data.session.intakeConfirmed, true);
  const answers = { name: 'Test Senior', college: h.college, branch: 'IT', degree: 'B.Tech', careerPath: 'PLACEMENT', placement: { company: 'Test Company', role: 'Engineer', ctc: 12 }, skillsAtSelection: [{ name: 'React' }], preparation: { startedIn: 'YEAR_3', months: 8 }, advice: 'Practise explaining your project.' };
  for (const [questionId, value] of Object.entries(answers)) assert.equal((await request('answer', { questionId, value })).status, 200);
  const review = await request('review');
  assert.equal(review.data.preview.public.package, 12);
  assert.equal((await request('publish', { confirm: false })).status, 400);
  assert.equal((await request('publish', { confirm: true })).status, 200);
  const wall = await fetch(`${base}/alumni`).then(r => r.json());
  assert.equal(wall.alumni[0].package, 12);
  assert.equal(wall.alumni[0].verified, false);
  assert(!JSON.stringify(wall).includes('intakeConfirmed'));
});
test('student account cannot bypass alumni entry by directly calling the backend', async () => {
  const replacement = mock.method(Profile, 'findOne', () => ({ lean: async () => ({ graduationYear: 2099 }) }));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/alumni-chat/start`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${h.token()}` }, body: '{}' });
    assert.equal(response.status, 403);
  } finally { replacement.mock.restore(); }
});
