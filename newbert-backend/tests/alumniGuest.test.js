const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/alumniChatHarness');

const harness = setup();
let server;
let base;
let version = 0;
let token;

async function request(path, body, guestToken = token) {
  if (!server) {
    server = harness.app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}/api`;
  }
  const response = await fetch(base + '/alumni-guest' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(guestToken ? { 'X-Alumni-Guest-Token': guestToken } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json() };
}
async function post(path, value = {}) {
  const result = await request(path, { version, ...value });
  if (result.data.session) version = result.data.session.version;
  return result;
}

after(() => server?.close());

test('a WhatsApp visitor can start and resume a private story without an account', async () => {
  assert.equal((await request('/session', undefined, null)).data.session, null);
  const started = await request('/start', {}, null);
  assert.equal(started.status, 201);
  token = started.data.guestToken;
  version = started.data.session.version;
  assert.match(token, /^[a-zA-Z0-9_-]{43}$/);
  assert.equal(started.data.session.answers.name, undefined);
  assert.equal((await request('/session', undefined, null)).data.session, null);
  assert.equal((await request('/session', undefined, 'x'.repeat(43))).status, 200);
  assert.equal((await request('/answer', { version, questionId: 'name', value: 'Nope' }, 'x'.repeat(43))).status, 401);
  assert.equal((await request('/start', {}, token)).data.session.id, started.data.session.id);
  const saved = await post('/answer', { questionId: 'name', value: 'Guest Senior' });
  assert.equal(saved.status, 200);
  assert.equal((await request('/session')).data.session.answers.name, 'Guest Senior');
});

test('guest publication requires review consent and enforces privacy on the existing Wall', async () => {
  const values = {
    college: harness.college, branch: 'IT', graduationYear: 2025, degree: 'B.Tech',
    careerPath: 'PLACEMENT', placement: { company: 'Sample Co', role: 'Engineer', ctc: 12 },
    skillsAtSelection: [{ name: 'React' }], preparation: { startedIn: 'YEAR_3', months: 8 },
    advice: 'Explain your work clearly.', mentorInterest: 'YES', mentorship: { topics: ['DSA'] },
    privacy: { 'placement.ctc': 'PRIVATE' },
  };
  for (const [questionId, value] of Object.entries(values)) {
    const result = await post('/answer', { questionId, value });
    assert.equal(result.status, 200, JSON.stringify(result.data));
  }
  const review = await request('/review');
  assert.equal(review.data.preview.public.package, undefined);
  assert.equal((await post('/publish', { confirm: false })).status, 400);
  const published = await post('/publish', { confirm: true });
  assert.equal(published.status, 200, JSON.stringify(published.data));
  assert.equal(published.data.session.status, 'COMPLETED');
  assert.equal(harness.alumni.size, 1);
  const record = [...harness.alumni.values()][0];
  assert.equal(record.guestSubmission, true);
  assert.equal(record.mentorshipEnabled, false);
  assert.equal(record.userId, undefined);
  const wall = await (await fetch(base + '/alumni')).json();
  assert.equal(wall.alumni.length, 1);
  assert.equal(wall.alumni[0].package, undefined);
  assert.equal(wall.alumni[0].verified, false);
  assert(!JSON.stringify(wall).includes(token));
  assert.equal((await post('/hide', { confirm: true })).status, 200);
  assert.equal((await (await fetch(base + '/alumni')).json()).alumni.length, 0);
});
