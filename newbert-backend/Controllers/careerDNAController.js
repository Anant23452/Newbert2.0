const Alumni = require('../Models/Alumni');
const Profile = require('../Models/Profile');
const { publicAlumniQuery } = require('../services/alumniPublicService');
const { buildCareerDNA, buildCareerDNAComparison, extractPracticeProfiles } = require('../services/careerDNAService');
const { getGithubActivity } = require('../services/githubService');
const { getLeetcodeStats } = require('../services/leetcodeService');
const { getCodeforcesStats } = require('../services/codeforcesService');
const { normalizePractice, invalid } = require('../services/alumniChatValidation');
const { listUserRepositories } = require('../services/githubProjectAnalyzerService');
const { PLATFORMS } = require('../config/alumniQuestions');

const SYNC_COOLDOWN_MS = 30000;
const syncTimestamps = new Map();
function throttleSync(userId, platform) {
  const key = `${userId}:${platform}`;
  const last = syncTimestamps.get(key) || 0;
  if (Date.now() - last < SYNC_COOLDOWN_MS) invalid('Please wait before syncing again.');
  syncTimestamps.set(key, Date.now());
}

async function findAlumni(userId) {
  const alumni = await Alumni.findOne({ userId });
  if (!alumni) invalid('Complete alumni onboarding before managing profiles.');
  return alumni;
}

async function connectProfile(req, res, next) {
  try {
    const { platform, profileUrl } = req.body || {};
    if (!platform || !PLATFORMS.includes(platform)) invalid('Choose a supported platform.');
    const normalized = normalizePractice(platform, { profileUrl: profileUrl || '', username: '' });
    const alumni = await findAlumni(req.auth.id);
    const profiles = Array.isArray(alumni.practiceProfiles) ? [...alumni.practiceProfiles] : [];
    const existing = profiles.findIndex(p => p.platform === platform && platform !== 'OTHER');
    if (existing >= 0) profiles[existing] = { ...profiles[existing], ...normalized };
    else profiles.push(normalized);
    alumni.practiceProfiles = profiles;
    alumni.markModified('practiceProfiles');
    await alumni.save();

    let syncResult = null;
    if (['GITHUB', 'LEETCODE', 'CODEFORCES'].includes(platform) && normalized.username) {
      try { syncResult = await doSync(platform, normalized.username); } catch (err) { syncResult = { error: err.message }; }
    }
    res.json({ profile: normalized, syncResult });
  } catch (err) { next(err); }
}

async function disconnectProfile(req, res, next) {
  try {
    const { platform } = req.params;
    const alumni = await findAlumni(req.auth.id);
    const profiles = Array.isArray(alumni.practiceProfiles) ? alumni.practiceProfiles.filter(p => p.platform !== platform) : [];
    alumni.practiceProfiles = profiles;
    alumni.markModified('practiceProfiles');
    await alumni.save();
    res.json({ removed: platform });
  } catch (err) { next(err); }
}

async function doSync(platform, username) {
  const now = new Date();
  const year = now.getFullYear();
  switch (platform) {
    case 'GITHUB': return { platform, stats: await getGithubActivity(username, [year, year - 1]), lastSyncedAt: now.toISOString() };
    case 'LEETCODE': return { platform, stats: await getLeetcodeStats(username, [year, year - 1]), lastSyncedAt: now.toISOString() };
    case 'CODEFORCES': return { platform, stats: await getCodeforcesStats(username), lastSyncedAt: now.toISOString() };
    default: return { platform, status: 'SYNC_UNAVAILABLE' };
  }
}

async function syncProfile(req, res, next) {
  try {
    const { platform } = req.params;
    throttleSync(req.auth.id, platform);
    const alumni = await findAlumni(req.auth.id);
    const profiles = Array.isArray(alumni.practiceProfiles) ? [...alumni.practiceProfiles] : [];
    const entry = profiles.find(p => p.platform === platform);
    if (!entry) invalid('Connect this platform first.');
    const result = await doSync(platform, entry.username);
    if (result.stats) {
      const idx = profiles.findIndex(p => p.platform === platform);
      profiles[idx] = { ...profiles[idx], syncedStats: result.stats, lastSyncedAt: result.lastSyncedAt };
      alumni.practiceProfiles = profiles;
      alumni.markModified('practiceProfiles');
      await alumni.save();
    }
    res.json(result);
  } catch (err) { next(err); }
}

async function getProfiles(req, res, next) {
  try {
    const alumni = await findAlumni(req.auth.id);
    res.json({ profiles: extractPracticeProfiles(alumni) });
  } catch (err) { next(err); }
}

async function getCareerDNA(req, res, next) {
  try {
    const alumni = await findAlumni(req.auth.id);
    res.json(buildCareerDNA(alumni));
  } catch (err) { next(err); }
}

async function getAlumniCareerDNA(req, res, next) {
  try {
    const alumni = await Alumni.findOne({ _id: req.params.id, ...publicAlumniQuery() }).lean();
    if (!alumni) return res.status(404).json({ message: 'Alumni not found or profile is private.' });
    const dna = buildCareerDNA(alumni);
    // Respect privacy: filter private profiles
    const privacy = alumni.privacy || {};
    if (privacy.practiceProfiles === 'PRIVATE') dna.practiceProfiles = [];
    if (privacy.coding === 'PRIVATE') dna.coding = { dsa: { solvedAtSelection: null }, competitiveProgramming: [], github: null };
    res.json(dna);
  } catch (err) { next(err); }
}

async function getAlumniEvidence(req, res, next) {
  try {
    const alumni = await Alumni.findOne({ _id: req.params.id, ...publicAlumniQuery() }).lean();
    if (!alumni) return res.status(404).json({ message: 'Alumni not found.' });
    const dna = buildCareerDNA(alumni);
    res.json({ verificationSummary: dna.verificationSummary, evidenceSummary: dna.evidenceSummary, skillsAtSelection: dna.skillsAtSelection, practiceProfiles: dna.practiceProfiles });
  } catch (err) { next(err); }
}

async function compareWithAlumni(req, res, next) {
  try {
    const alumni = await Alumni.findOne({ _id: req.params.id, ...publicAlumniQuery() }).lean();
    if (!alumni) return res.status(404).json({ message: 'Alumni not found.' });
    const student = await Profile.findOne({ userId: req.auth.id }).lean();
    if (!student) return res.status(404).json({ message: 'Complete your profile first.' });
    const dna = buildCareerDNA(alumni);
    res.json(buildCareerDNAComparison(student, dna));
  } catch (err) { next(err); }
}

async function getGithubEvidence(req, res, next) {
  try {
    const alumni = await findAlumni(req.auth.id);
    const ghProfile = extractPracticeProfiles(alumni).find(p => p.platform === 'GITHUB');
    if (!ghProfile?.username) return res.json({ repositories: [], message: 'Connect GitHub first.' });
    const repos = await listUserRepositories(ghProfile.username);
    res.json({ username: ghProfile.username, repositories: repos.slice(0, 20) });
  } catch (err) { next(err); }
}

module.exports = { connectProfile, disconnectProfile, syncProfile, getProfiles, getCareerDNA, getAlumniCareerDNA, getAlumniEvidence, compareWithAlumni, getGithubEvidence };
