const crypto = require('node:crypto');
const Session = require('../Models/AlumniGuestSession');
const Alumni = require('../Models/Alumni');
const engine = require('../services/alumniQuestionEngine');
const { ownerSnapshot, buildPublication } = require('../services/alumniChatService');
const { redactStory, legacyFields } = require('../services/alumniStoryService');
const { findCollegeByIdentifier } = require('../services/collegeService');
const { extractAnswer } = require('../services/alumniAIService');
const { cleanText, invalid, normalizePractice } = require('../services/alumniChatValidation');

const tokenHash = token => crypto.createHash('sha256').update(token).digest('hex');
const tokenIsValid = token => typeof token === 'string' && /^[a-zA-Z0-9_-]{43}$/.test(token);
const handle = fn => async (req, res, next) => {
  try { await fn(req, res); }
  catch (error) {
    if (error.name === 'VersionError' || error.code === 11000) return res.status(409).json({ message: 'This story changed in another tab. Reload and try again.' });
    next(error);
  }
};

async function findSession(req) {
  const token = req.get('X-Alumni-Guest-Token');
  if (!tokenIsValid(token)) return null;
  return Session.findOne({ tokenHash: tokenHash(token) });
}

exports.requireGuest = async (req, res, next) => {
  try {
    const session = await findSession(req);
    if (!session) return res.status(401).json({ message: 'This guest story is no longer available on this device. Start a new story if you need to.' });
    req.guestSession = session;
    req.auth = { id: `guest:${session._id}` }; // Reuse Newbert's per-owner AI rate limit.
    return next();
  } catch (error) { return next(error); }
};

function active(req, checkVersion = true) {
  const session = req.guestSession;
  if (!session) invalid('Start a guest story first.');
  if (session.publishLockUntil > new Date()) invalid('Your story is being published. Please wait a moment.');
  if (checkVersion && req.body.version !== session.__v) {
    const error = new Error('Your story changed in another tab. Reload the saved conversation.');
    error.status = 409;
    throw error;
  }
  return session;
}

async function save(session) {
  session.lastActivityAt = new Date();
  for (const field of ['answers', 'rawAnswers', 'extractedAnswers', 'inactiveAnswers', 'pendingExtraction']) session.markModified(field);
  await session.save();
}

async function answerValue(question, value) {
  if (question.id !== 'college') return value;
  const college = await findCollegeByIdentifier(value?.collegeId || value?._id);
  if (!college) invalid('Choose a college from the suggestions.');
  return { name: college.name, collegeId: college.collegeId };
}

exports.start = handle(async (req, res) => {
  const existing = await findSession(req);
  if (existing) return res.json(ownerSnapshot(existing));
  const token = crypto.randomBytes(32).toString('base64url');
  const session = { tokenHash: tokenHash(token), answers: {}, rawAnswers: {}, extractedAnswers: {}, inactiveAnswers: {}, skippedQuestions: [], history: [], prefill: {} };
  engine.reconcile(session);
  const created = await Session.create(session);
  res.status(201).json({ ...ownerSnapshot(created), guestToken: token });
});

exports.session = handle(async (req, res) => {
  const session = await findSession(req);
  res.json(session ? ownerSnapshot(session) : { session: null });
});

exports.answer = handle(async (req, res) => {
  const session = active(req);
  const id = req.params.questionId || req.body.questionId;
  const question = engine.questionFor(session, id);
  engine.answer(session, id, await answerValue(question, req.body.value), req.body.rawAnswer);
  await save(session);
  res.json(ownerSnapshot(session));
});

exports.skip = handle(async (req, res) => {
  const session = active(req);
  engine.skip(session, req.body.questionId);
  await save(session);
  res.json(ownerSnapshot(session));
});

exports.back = handle(async (req, res) => {
  const session = active(req);
  engine.back(session);
  await save(session);
  res.json(ownerSnapshot(session));
});

exports.review = handle(async (req, res) => {
  const session = active(req, false);
  const privacy = session.answers.privacy || {};
  res.json(ownerSnapshot(session, {
    preview: {
      public: legacyFields(redactStory(session.answers, privacy, false)),
      college: legacyFields(redactStory(session.answers, privacy, true)),
    },
  }));
});

exports.extract = handle(async (req, res) => {
  const session = active(req);
  const question = engine.questionFor(session, req.body.questionId);
  if (!question.ai) invalid('This question uses direct answers.');
  const raw = cleanText(req.body.rawAnswer, 6000);
  if (!raw) invalid('Write your answer first.');
  session.rawAnswers = { ...session.rawAnswers, [question.id]: raw };
  session.pendingExtraction = null;
  session.currentQuestionId = question.id;
  session.currentSection = question.section;
  await save(session);
  let extraction;
  try { extraction = await extractAnswer(question, raw); }
  catch { return res.json(ownerSnapshot(session, { notice: 'Your words are saved. AI is unavailable; enter the details directly or continue.' })); }
  session.pendingExtraction = { questionId: question.id, rawAnswer: raw, ...extraction };
  await save(session);
  res.json(ownerSnapshot(session));
});

exports.confirm = handle(async (req, res) => {
  const session = active(req);
  const pending = session.pendingExtraction;
  if (!pending) invalid('There is no extraction to confirm.');
  engine.answer(session, pending.questionId, req.body.value ?? pending.answer, pending.rawAnswer);
  session.extractedAnswers = { ...session.extractedAnswers, [pending.questionId]: { ...pending, answer: session.answers[pending.questionId], confirmedAt: new Date() } };
  await save(session);
  res.json(ownerSnapshot(session));
});

exports.publish = handle(async (req, res) => {
  if (req.body.confirm !== true) invalid('Review your story and confirm publication.');
  const session = active(req);
  const college = await findCollegeByIdentifier(session.answers.college?.collegeId);
  const payload = buildPublication(session, college);
  payload.mentorshipEnabled = false; // Guest stories have no account that can receive requests.
  payload.availableTopics = [];
  payload.guestSubmission = true;
  session.publishLockUntil = new Date(Date.now() + 30000);
  await save(session);
  try {
    const alumni = await Alumni.findOneAndUpdate(
      { guestSessionId: session._id },
      { $set: payload, $setOnInsert: { guestSessionId: session._id } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    session.publishedAlumniId = alumni._id;
    session.status = 'COMPLETED';
    session.completedAt = new Date();
    session.publishLockUntil = null;
    await save(session);
    res.json(ownerSnapshot(session));
  } catch (error) {
    session.publishLockUntil = null;
    await save(session);
    throw error;
  }
});

exports.hide = handle(async (req, res) => {
  if (req.body.confirm !== true) invalid('Confirm hiding your story.');
  const session = active(req, false);
  await Alumni.updateOne({ guestSessionId: session._id }, { $set: { publicationStatus: 'HIDDEN' } });
  res.json({ message: 'Your story is hidden from the Alumni Wall.' });
});

exports.restart = handle(async (req, res) => {
  if (req.body.confirm !== true) invalid('Confirm restarting your draft. Your published story remains unchanged.');
  const session = active(req);
  session.answers = {}; session.rawAnswers = {}; session.extractedAnswers = {};
  session.inactiveAnswers = {}; session.history = []; session.skippedQuestions = [];
  session.pendingExtraction = null; session.startedAt = new Date(); session.completedAt = null;
  engine.reconcile(session);
  await save(session);
  res.json(ownerSnapshot(session));
});

exports.inspectPractice = handle(async (req, res) => {
  const session = active(req, false);
  const question = engine.questionFor(session, req.body.questionId);
  if (!['GITHUB', 'LEETCODE'].includes(question.platform)) invalid('Live information is available for GitHub and LeetCode.');
  const profile = normalizePractice(question.platform, req.body.value);
  try {
    const metrics = question.platform === 'LEETCODE'
      ? { currentSolved: (await require('../services/leetcodeService').getLeetcodeStats(profile.username, [new Date().getFullYear()])).totalSolved }
      : { publicRepositories: (await require('../services/githubService').getGithubActivity(profile.username, [new Date().getFullYear()], { skipRepoScan: true })).publicRepos ?? null };
    res.json({ metrics, message: 'These are current public metrics, not identity or selection-time verification.' });
  } catch { res.json({ metrics: null, message: 'This link could not be checked right now. You can still save it.' }); }
});

exports.githubRepos = handle(async (req, res) => {
  let username = cleanText(req.query.username || '', 60);
  if (!username) {
    const session = active(req, false);
    const p = session?.answers?.['practice:GITHUB'] || session?.prefill?.['practice:GITHUB'];
    username = p?.username;
  }
  if (!username) return res.json({ repositories: [] });
  try {
    const { listUserRepositories } = require('../services/githubProjectAnalyzerService');
    const repos = await listUserRepositories(username);
    res.json({ username, repositories: repos.slice(0, 30) });
  } catch (err) {
    res.json({ username, repositories: [], error: err.message });
  }
});

exports.tokenHash = tokenHash;
