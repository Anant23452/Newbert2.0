const Profile = require("../Models/Profile");
const User = require("../Models/User");
const Alumni = require("../Models/Alumni");
const { parseProfileUsername } = require("../services/profileIdentityService");
const { getGithubActivity } = require("../services/githubService");
const { getLeetcodeStats } = require("../services/leetcodeService");
const { findBestSeniorMatch } = require("../services/seniorMatchService");
const { isProfileComplete, getMissingProfileFields, profileStrength } = require("../services/profileCompletionService");
const { providersNeedingSync, manualSkills } = require("../services/profileSyncPolicy");
const { findCollegeByIdentifier, resolveProfileCollege, sameCollegeQuery } = require("../services/collegeService");
const { DEFAULT_SECTIONS, normalizePrivacy, serializePublicProfile } = require("../services/publicProfileService");
const { getPublicStreakSnapshot } = require("../services/leaderboardService");
const { buildSkillEvidence, buildEffectiveSkillInventory } = require("../services/skillEvidenceService");
const { normalizeSkill } = require("../services/skillNormalizationService");
const { toActivityDate, kolkataDate, getKolkataToday, previousKolkataDay, calculateStreaks, getCurrentStreak } = require("../utils/dateNormalization");
const { normalizeDailyItem, mergeActivitySources, getNormalizedUserActivity } = require("../services/activityAggregationService");

const INVALID_LEETCODE_USERNAMES = new Set(["u", "profile"]);
const activeProfileSyncs = new Set();

function normalizeLeetcodeStats(stats) {
  if (!stats || INVALID_LEETCODE_USERNAMES.has(String(stats.username || "").toLowerCase())) return null;
  return {
    ...stats,
    totalSolved: stats.totalSolved ?? stats.solved ?? 0,
    easySolved: stats.easySolved ?? stats.easy ?? 0,
    mediumSolved: stats.mediumSolved ?? stats.medium ?? 0,
    hardSolved: stats.hardSolved ?? stats.hard ?? 0,
  };
}

exports.getPublicProfile = async (req, res, next) => {
  try {
    const isOwner = Boolean(req.auth?.id && String(req.auth.id) === String(req.params.userId));
    const [profile, user] = await Promise.all([Profile.findOne({ userId: req.params.userId }).lean(), User.findById(req.params.userId).select("name email avatarUrl").lean()]);
    if (!profile || !user) return res.status(404).json({ message: "Profile not found." });

    const today = (profile.activityCalendar || []).find((day) => day.date === getKolkataToday());
    const streakLeaderboard = await getPublicStreakSnapshot(req.params.userId);
    const serialized = serializePublicProfile(profile, user, today, streakLeaderboard);
    if (isOwner) {
      return res.json({ ...serialized, isOwner: true, ownerProfile: response(profile, user) });
    }
    return res.json(serialized);
  } catch (error) { return next(error); }
};

function mergeActivity(githubActivity = [], leetcodeActivity = [], storedActivity = [], timezone = "Asia/Kolkata") {
  return mergeActivitySources({
    storedActivity,
    freshGithub: githubActivity,
    freshLeetcode: leetcodeActivity,
    timezone,
  });
}

function sanitizedActivity(profile, leetcodeStats, timezone = "Asia/Kolkata") {
  const leetcodeIsValid = Boolean(leetcodeStats);
  return (profile.activityCalendar || []).map((day) => {
    const item = normalizeDailyItem(day, timezone);
    if (!leetcodeIsValid) {
      // normalizeDailyItem exposes canonical provider counts as numbers. Keep
      // GitHub/project activity intact when LeetCode is unavailable.
      const githubActivity = Number(item.github) || Number(item.githubCommits) || 0;
      const projectActivity = Number(item.projectActivity) || 0;
      item.leetcode = 0;
      item.leetcodeAccepted = 0;
      item.leetcodeAcceptedProblems = [];
      item.total = githubActivity + projectActivity;
      item.totalVerifiedActivity = item.total;
      item.breakdown.leetcode = { solved: 0, acceptedProblems: [], submissions: 0 };
      item.breakdown.github.total = githubActivity;
    }
    return item;
  }).filter((day) => day.totalVerifiedActivity > 0);
}

function response(profile, user) {
  const leetcodeStats = normalizeLeetcodeStats(profile.leetcodeStats);
  const activityCalendar = sanitizedActivity(profile, leetcodeStats);
  const streaks = calculateStreaks(activityCalendar);
  const effectiveInventory = buildEffectiveSkillInventory(profile, { targetRole: profile.targetRole });
  return {
    userId: String(user._id),
    name: user.name,
    email: user.email,
    college: profile.college || "",
    collegeId: profile.collegeId || null,
    collegeMongoId: profile.collegeRef ? String(profile.collegeRef) : null,
    collegeName: profile.collegeName || profile.college || "",
    selectedCollege: profile.collegeRef ? { _id: String(profile.collegeRef), collegeId: profile.collegeId || null, name: profile.collegeName || profile.college || "" } : null,
    branch: profile.branch || "",
    graduationYear: profile.graduationYear || "",
    bio: profile.bio || "",
    targetRole: profile.targetRole || "",
    targetCompany: profile.targetCompany || "",
    github: profile.githubUrl || "",
    githubUsername: profile.githubUsername || profile.githubStats?.username || "",
    leetcode: profile.leetcodeUrl || "",
    leetcodeUsername: profile.leetcodeUsername || leetcodeStats?.username || "",
    linkedin: profile.linkedinUrl || "",
    avatar: profile.avatarUrl || user.avatarUrl || "",
    cover: profile.coverUrl || "",
    projects: profile.projects ?? null,
    projectDetails: profile.projectDetails || [],
    cgpa: profile.cgpa ?? null,
    skills: profile.skills,
    effectiveSkills: effectiveInventory.effectiveSkills,
    effectiveCategories: effectiveInventory.categories,
    effectiveInventory,
    githubStats: profile.githubStats || null,
    leetcodeStats,
    activityCalendar,
    syncErrors: profile.syncErrors || null,
    lastSyncedAt: profile.lastSyncedAt || null,
    syncNeeded: providersNeedingSync(profile),
    missingProfileFields: getMissingProfileFields(profile),
    onboardingCompleted: isProfileComplete(profile),
    profileStrength: profileStrength(profile),
    connections: {
      github: { connected: Boolean(profile.githubUsername || profile.githubUrl), synced: Boolean(profile.githubStats), error: profile.syncErrors?.github || null },
      leetcode: { connected: Boolean(profile.leetcodeUsername || profile.leetcodeUrl), synced: Boolean(leetcodeStats), error: profile.syncErrors?.leetcode || null },
      linkedin: { connected: Boolean(profile.linkedinUrl), synced: false, linkOnly: true, error: null },
    },
    privacy: normalizePrivacy(profile.privacy, profile.visibility || profile._doc?.visibility),
    ...streaks,
  };
}

function safeUsername(value, platform) {
  try { return parseProfileUsername(value, platform); }
  catch { return ""; }
}

function extractStoredActivity(profile, source) {
  return (profile.activityCalendar || []).map((day) => source === "github"
    ? { date: day.date, count: Number(day.github) || 0, commits: Number(day.githubCommits) || 0, pullRequests: Number(day.githubPullRequests) || 0, issues: Number(day.githubIssues) || 0, repositoriesCreated: Number(day.githubRepositoriesCreated) || 0 }
    : { date: day.date, count: Number(day.leetcode) || 0, acceptedProblems: Array.isArray(day.leetcodeAcceptedProblems) ? day.leetcodeAcceptedProblems : [] })
    .filter((day) => day.count > 0 || day.commits > 0 || day.acceptedProblems?.length);
}

function buildRatedSkills(githubStats, leetcodeStats, existingSkills = []) {
  const rated = new Map();
  for (const skill of existingSkills) {
    const item = typeof skill === "string" ? { name: skill, source: "manual" } : skill;
    if (item?.name) rated.set(item.name.trim().toLowerCase(), { name: item.name.trim(), score: item.score ?? 0, source: item.source || "manual" });
  }
  for (const [name, count] of Object.entries(githubStats?.languageCounts || {})) rated.set(name.toLowerCase(), { name, score: Math.min(95, 40 + count * 12), source: "github" });
  for (const [name, count] of Object.entries(leetcodeStats?.languageCounts || {})) {
    const key = name.toLowerCase();
    const skill = { name, score: Math.min(100, 35 + count * 4), source: "leetcode" };
    if (!rated.has(key) || rated.get(key).score < skill.score) rated.set(key, skill);
  }
  if (leetcodeStats?.totalSolved > 0) {
    const score = Math.min(100, 30 + Math.round(leetcodeStats.totalSolved * 0.35));
    rated.set("dsa", { name: "DSA", score, source: "leetcode" });
    rated.set("problem solving", { name: "Problem Solving", score, source: "leetcode" });
  }
  return [...rated.values()].sort((a, b) => b.score - a.score);
}

exports.getMyProfile = async (req, res, next) => {
  try {
    const [user, profile] = await Promise.all([User.findById(req.auth.id), Profile.findOne({ userId: req.auth.id })]);
    if (!user) return res.status(404).json({ message: "User not found." });
    const savedProfile = profile || await Profile.create({ userId: user._id, avatarUrl: user.avatarUrl || "" });
    const resolvedCollege = await resolveProfileCollege(savedProfile.toObject(), { persist: true });
    if (resolvedCollege) { savedProfile.collegeRef = resolvedCollege._id; savedProfile.collegeId = resolvedCollege.collegeId; savedProfile.collegeName = resolvedCollege.name; savedProfile.college = resolvedCollege.name; }
    const complete = isProfileComplete(savedProfile);
    if (savedProfile.onboardingCompleted !== complete) {
      savedProfile.onboardingCompleted = complete;
      await savedProfile.save();
    }
    return res.json(response(savedProfile, user));
  } catch (error) { return next(error); }
};

exports.updateMyProfile = async (req, res, next) => {
  try {
    if (activeProfileSyncs.has(String(req.auth.id))) return res.status(409).json({ message: "Your accounts are syncing. Please save your edits once that finishes." });
    const userUpdates = {};
    if (typeof req.body.name === "string" && req.body.name.trim()) userUpdates.name = req.body.name.trim();
    const existing = await Profile.findOne({ userId: req.auth.id });
    const supplied = new Set(Object.keys(req.body));
    // Merge editable fields only. Partial edits must not disconnect accounts or erase education.
    const previous = existing ? response(existing, { _id: req.auth.id }) : {};
    req.body = { ...previous, ...req.body, collegeId: supplied.has("collegeId") ? req.body.collegeId : existing?.collegeRef || existing?.collegeId };
    const optionalText = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
    const githubUsername = req.body.github ? safeUsername(req.body.github, "github") : null;
    const leetcodeUsername = req.body.leetcode ? safeUsername(req.body.leetcode, "leetcode") : null;
    if (req.body.github && !githubUsername) return res.status(400).json({ message: "Enter a valid GitHub username or profile URL.", source: "github" });
    if (req.body.leetcode && !leetcodeUsername) return res.status(400).json({ message: "Enter a valid LeetCode username or profile URL.", source: "leetcode" });
    const normalizeSkills = (skills) => {
      if (!Array.isArray(skills)) return [];
      const unique = new Map();
      for (const skill of skills) {
        const item = typeof skill === "string" ? { name: skill } : skill;
        const name = optionalText(item?.name);
        if (!name) continue;
        const key = name.toLocaleLowerCase();
        if (!unique.has(key)) unique.set(key, { name, score: Number.isFinite(Number(item.score)) ? Number(item.score) : 0, source: item.source || "manual" });
      }
      return [...unique.values()];
    };
    const requestedCollegeId = optionalText(req.body.collegeId);
    const canonicalCollege = await findCollegeByIdentifier(requestedCollegeId);
    if (!requestedCollegeId || !canonicalCollege) return res.status(400).json({ code: "INVALID_COLLEGE", message: "Please select a college from the suggestions." });
    const set = {
      college: canonicalCollege.name, collegeRef: canonicalCollege._id, collegeId: canonicalCollege.collegeId, collegeName: canonicalCollege.name, branch: optionalText(req.body.branch), graduationYear: req.body.graduationYear === "" || req.body.graduationYear == null ? null : Number(req.body.graduationYear),
      bio: optionalText(req.body.bio), targetRole: optionalText(req.body.targetRole), targetCompany: optionalText(req.body.targetCompany),
      githubUrl: optionalText(req.body.github), githubUsername, leetcodeUrl: optionalText(req.body.leetcode), leetcodeUsername, linkedinUrl: optionalText(req.body.linkedin),
      avatarUrl: optionalText(req.body.avatar), coverUrl: optionalText(req.body.cover), projects: req.body.projects === "" || req.body.projects == null ? null : Number(req.body.projects), cgpa: req.body.cgpa === "" || req.body.cgpa == null ? null : Number(req.body.cgpa),
      skills: supplied.has("skills") ? manualSkills(normalizeSkills(req.body.skills), existing?.skills || []) : existing?.skills || [],
    };
    const githubChanged = String(existing?.githubUsername || "").toLowerCase() !== String(githubUsername || "").toLowerCase();
    const leetcodeChanged = String(existing?.leetcodeUsername || "").toLowerCase() !== String(leetcodeUsername || "").toLowerCase();
    if (githubChanged) set.githubStats = null;
    if (leetcodeChanged) set.leetcodeStats = null;
    if (githubChanged || leetcodeChanged) {
      set.syncErrors = { github: githubChanged ? null : existing?.syncErrors?.github, leetcode: leetcodeChanged ? null : existing?.syncErrors?.leetcode };
      set.skills = set.skills.filter((skill) => !(githubChanged && skill.source === "github") && !(leetcodeChanged && skill.source === "leetcode"));
      set.evidenceCache = { ...(existing?.evidenceCache || {}), ...(githubChanged && { github: null }), ...(leetcodeChanged && { leetcode: null }), readiness: null };
      const activityCalendar = (existing?.activityCalendar || []).map((day) => ({
        date: day.date,
        github: githubChanged ? 0 : Number(day.github) || 0,
        githubCommits: githubChanged ? 0 : Number(day.githubCommits) || 0,
        githubPullRequests: githubChanged ? 0 : Number(day.githubPullRequests) || 0,
        githubIssues: githubChanged ? 0 : Number(day.githubIssues) || 0,
        githubRepositoriesCreated: githubChanged ? 0 : Number(day.githubRepositoriesCreated) || 0,
        leetcode: leetcodeChanged ? 0 : Number(day.leetcode) || 0,
        leetcodeAcceptedProblems: leetcodeChanged ? [] : (day.leetcodeAcceptedProblems || []),
      })).map((day) => ({ ...day, leetcodeAccepted: day.leetcodeAcceptedProblems.length, total: day.github + day.leetcode })).filter((day) => day.total > 0);
      Object.assign(set, { activityCalendar, ...calculateStreaks(activityCalendar) });
    }
    let profile = await Profile.findOneAndUpdate(
      { userId: req.auth.id },
      { $set: set },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    const complete = isProfileComplete(profile);
    if (profile.onboardingCompleted !== complete) {
      profile.onboardingCompleted = complete;
      await profile.save();
    }
    const user = Object.keys(userUpdates).length ? await User.findByIdAndUpdate(req.auth.id, { $set: userUpdates }, { new: true, runValidators: true }) : await User.findById(req.auth.id);
    return res.json(response(profile, user));
  } catch (error) { return next(error); }
};

exports.updatePrivacy = async (req, res, next) => {
  try {
    const fieldAliases = { bio: "about" };
    if (req.body.field != null) {
      const requestedField = String(req.body.field);
      const field = fieldAliases[requestedField] || requestedField;
      const visibility = req.body.visibility;
      const allowed = new Set(["profileVisibility", ...Object.keys(DEFAULT_SECTIONS)]);
      if (!allowed.has(field)) return res.status(400).json({ message: "Choose a valid privacy field." });
      if (!["public", "private"].includes(visibility)) return res.status(400).json({ message: "Choose public or private visibility." });

      const path = field === "profileVisibility" ? "privacy.profileVisibility" : `privacy.sections.${field}`;
      const value = field === "profileVisibility" ? visibility : visibility === "public";
      const profile = await Profile.findOneAndUpdate(
        { userId: req.auth.id },
        { $set: { [path]: value }, $unset: { visibility: "" } },
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true, strict: false },
      );
      if (!profile) return res.status(404).json({ message: "Profile not found." });
      return res.json({ success: true, message: "Privacy updated.", privacy: normalizePrivacy(profile.privacy) });
    }

    const visibility = req.body.profileVisibility;
    if (!["public", "private"].includes(visibility)) return res.status(400).json({ message: "Choose public or private profile visibility." });
    const requestedSections = req.body.sections && typeof req.body.sections === "object" ? req.body.sections : {};
    const invalidKey = Object.keys(requestedSections).find((key) => !Object.hasOwn(DEFAULT_SECTIONS, key));
    if (invalidKey) return res.status(400).json({ message: `Privacy section '${invalidKey}' cannot be changed.` });
    const existing = await Profile.findOne({ userId: req.auth.id }).lean();
    const current = normalizePrivacy(existing?.privacy);
    const sections = { ...current.sections };
    for (const [key, value] of Object.entries(requestedSections)) {
      if (typeof value !== "boolean") return res.status(400).json({ message: `Privacy section '${key}' must be true or false.` });
      sections[key] = value;
    }
    const updated = await Profile.findOneAndUpdate(
      { userId: req.auth.id },
      { $set: { "privacy.profileVisibility": visibility, "privacy.sections": sections }, $unset: { visibility: "" } },
      { new: true, runValidators: true, strict: false },
    );
    if (!updated) return res.status(404).json({ message: "Profile not found." });
    return res.json({ success: true, message: "Privacy settings updated.", privacy: normalizePrivacy(updated.privacy) });
  } catch (error) { return next(error); }
};

exports.syncPublicProfiles = async (req, res, next) => {
  const syncKey = String(req.auth.id);
  if (activeProfileSyncs.has(syncKey)) return res.status(409).json({ message: "Your profile sync is already running." });
  activeProfileSyncs.add(syncKey);
  try {
    const existing = await Profile.findOne({ userId: req.auth.id }) || new Profile({ userId: req.auth.id });
    const user = await User.findById(req.auth.id);
    const timezone = user?.timezone || existing.timezone || "Asia/Kolkata";
    const isRefreshOnly = !req.body.githubUsername && !req.body.github && !req.body.leetcodeUsername && !req.body.leetcode;
    const COOLDOWN_MS = 30000;
    if (existing.lastSyncAttemptAt && Date.now() - new Date(existing.lastSyncAttemptAt).getTime() < COOLDOWN_MS) {
      return res.status(429).json({ message: "Your stats were refreshed recently. Try again in a few seconds." });
    }
    const githubInput = req.body.githubUsername || req.body.github || existing.githubUsername || existing.githubUrl;
    const leetcodeInput = req.body.leetcodeUsername || req.body.leetcode || existing.leetcodeUsername || existing.leetcodeUrl;
    let githubUsername = "";
    let leetcodeUsername = "";
    try { if (githubInput) githubUsername = parseProfileUsername(githubInput, "github"); }
    catch (error) { return res.status(400).json({ message: error.message, source: "github" }); }
    try { if (leetcodeInput) leetcodeUsername = parseProfileUsername(leetcodeInput, "leetcode"); }
    catch (error) { return res.status(400).json({ message: error.message, source: "leetcode" }); }
    if (!githubUsername && !leetcodeUsername) return res.status(400).json({ message: "Add a GitHub or LeetCode profile first." });

    const providers = req.body.providers || ["github", "leetcode"];
    if (!Array.isArray(providers) || !providers.length || providers.some((p) => !["github", "leetcode"].includes(p))) return res.status(400).json({ message: "Choose GitHub or LeetCode to refresh." });
    // Persist the cooldown so separate backend workers share the same limit.
    const acquired = await Profile.findOneAndUpdate({ userId: req.auth.id, $or: [{ lastSyncAttemptAt: null }, { lastSyncAttemptAt: { $lt: new Date(Date.now() - COOLDOWN_MS) } }] }, { $set: { lastSyncAttemptAt: new Date() } }, { new: true });
    if (!acquired) return res.status(429).json({ message: "A sync was started recently. Please try again in 30 seconds." });
    const syncGithub = Boolean(githubUsername && providers.includes("github"));
    const syncLeetcode = Boolean(leetcodeUsername && providers.includes("leetcode"));

    const currentYear = Number(getKolkataToday(timezone).slice(0, 4));
    const years = [currentYear - 2, currentYear - 1, currentYear];
    const [githubResult, leetcodeResult] = await Promise.allSettled([
      syncGithub ? getGithubActivity(githubUsername, years, { timezone, skipRepoScan: isRefreshOnly && Boolean(existing.githubStats?.repositories?.length), existingRepositories: existing.githubStats?.repositories }) : Promise.resolve(null),
      syncLeetcode ? getLeetcodeStats(leetcodeUsername, years, { timezone }) : Promise.resolve(null),
    ]);
    const githubFresh = githubResult.status === "fulfilled" ? githubResult.value : null;
    const leetcodeFresh = leetcodeResult.status === "fulfilled" ? leetcodeResult.value : null;
    const syncErrors = {
      github: !syncGithub ? existing.syncErrors?.github || null : githubResult.status === "rejected" ? githubResult.reason.message : githubFresh?.activityError || null,
      leetcode: !syncLeetcode ? existing.syncErrors?.leetcode || null : leetcodeResult.status === "rejected" ? leetcodeResult.reason.message : leetcodeFresh?.activityError || null,
    };

    const hasMatchingCache = Boolean((existing.githubStats && existing.githubStats.username?.toLowerCase() === githubUsername.toLowerCase()) || (existing.leetcodeStats && normalizeLeetcodeStats(existing.leetcodeStats)?.username?.toLowerCase() === leetcodeUsername.toLowerCase()));
    if (!githubFresh && !leetcodeFresh && !hasMatchingCache) {
      const failed = await Profile.findOneAndUpdate({ userId: req.auth.id }, { $set: { syncErrors } }, { new: true });
      return res.json({ profile: response(failed, user), syncErrors });
    }

    const sameGithub = existing.githubStats?.username?.toLowerCase() === githubUsername.toLowerCase();
    const existingLeetcode = normalizeLeetcodeStats(existing.leetcodeStats);
    const sameLeetcode = existingLeetcode?.username?.toLowerCase() === leetcodeUsername.toLowerCase();
    const githubStats = githubFresh || (sameGithub ? existing.githubStats : null);
    const leetcodeStats = leetcodeFresh || (sameLeetcode ? existingLeetcode : null);

    const storedGithub = sameGithub ? extractStoredActivity(existing, "github") : [];
    const freshGithubActivity = githubFresh?.activity?.length ? githubFresh.activity : [];
    const storedLeetcode = sameLeetcode ? extractStoredActivity(existing, "leetcode") : [];
    const freshLeetcodeActivity = leetcodeFresh?.activity?.length ? leetcodeFresh.activity : [];

    const activityCalendar = mergeActivity(
      freshGithubActivity.length ? freshGithubActivity : storedGithub,
      freshLeetcodeActivity.length ? freshLeetcodeActivity : storedLeetcode,
      existing.activityCalendar || [],
      timezone,
    );
    const streaks = calculateStreaks(activityCalendar);
    const skills = buildRatedSkills(githubStats, leetcodeStats, existing.skills);
    const githubForStorage = githubStats ? { ...githubStats, activity: undefined } : null;
    const leetcodeForStorage = leetcodeStats ? { ...leetcodeStats, activity: undefined } : null;

    const evidenceInput = { ...existing.toObject(), githubStats: githubForStorage, leetcodeStats: leetcodeForStorage, activityCalendar };
    const normalizedEvidence = buildSkillEvidence(evidenceInput);
    const set = {
      ...(githubFresh && { githubUsername: githubFresh.username, githubUrl: `https://github.com/${githubFresh.username}`, githubStats: githubForStorage, ...(!existing.avatarUrl && githubFresh.avatar && { avatarUrl: githubFresh.avatar }) }),
      ...(leetcodeFresh && { leetcodeUsername: leetcodeFresh.username, leetcodeUrl: `https://leetcode.com/u/${leetcodeFresh.username}`, leetcodeStats: leetcodeForStorage }),
      activityCalendar,
      ...streaks,
      ...(skills.length && { skills }),
      syncErrors,
      evidenceCache: {
        github: githubForStorage ? { updatedAt: githubFresh ? new Date() : existing.evidenceCache?.github?.updatedAt || existing.lastSyncedAt, stale: !githubFresh, data: { repositories: githubForStorage.repositories || [], repositoryEvidenceError: githubForStorage.repositoryEvidenceError || syncErrors.github || null } } : null,
        leetcode: leetcodeForStorage ? { updatedAt: leetcodeFresh ? new Date() : existing.evidenceCache?.leetcode?.updatedAt || existing.lastSyncedAt, stale: !leetcodeFresh, data: normalizedEvidence.leetcode } : null,
        readiness: { updatedAt: new Date(), data: normalizedEvidence },
      },
      lastSyncedAt: githubFresh || leetcodeFresh ? new Date() : existing.lastSyncedAt,
    };
    const profile = await Profile.findOneAndUpdate({ userId: req.auth.id, updatedAt: acquired.updatedAt }, { $set: set }, { new: true });
    if (!profile) return res.status(409).json({ message: "Your profile changed during sync. Refresh again to update the latest accounts." });
    return res.json({ profile: response(profile, user), syncErrors });
  } catch (error) { return next(error); }
  finally { activeProfileSyncs.delete(syncKey); }
};

exports.getEffectiveSkills = async (req, res, next) => {
  try {
    const profile = await Profile.findOne({ userId: req.auth.id }).lean();
    if (!profile) return res.status(404).json({ message: "Profile not found." });
    const inventory = buildEffectiveSkillInventory(profile, { targetRole: profile.targetRole });
    return res.json(inventory);
  } catch (error) { return next(error); }
};

exports.getSkillEvidenceDetail = async (req, res, next) => {
  try {
    const profile = await Profile.findOne({ userId: req.auth.id }).lean();
    if (!profile) return res.status(404).json({ message: "Profile not found." });
    const inventory = buildEffectiveSkillInventory(profile, { targetRole: profile.targetRole });
    const targetCanonical = normalizeSkill(req.params.skill);
    const detail = inventory.effectiveSkills.find(
      (s) => s.canonical === targetCanonical || s.skill.toLowerCase() === String(req.params.skill).toLowerCase()
    );
    if (!detail) return res.status(404).json({ message: `No evidence found for skill "${req.params.skill}".` });
    return res.json(detail);
  } catch (error) { return next(error); }
};

module.exports.calculateStreaks = calculateStreaks;
module.exports.mergeActivity = mergeActivity;
module.exports.sanitizedActivity = sanitizedActivity;
