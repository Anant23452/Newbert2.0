const Profile = require("../Models/Profile");
const User = require("../Models/User");
const Alumni = require("../Models/Alumni");
const { parseProfileUsername } = require("../services/profileIdentityService");
const { getGithubActivity } = require("../services/githubService");
const { getLeetcodeStats } = require("../services/leetcodeService");
const { findBestSeniorMatch } = require("../services/seniorMatchService");
const { isProfileComplete, profileStrength } = require("../services/profileCompletionService");

const INVALID_LEETCODE_USERNAMES = new Set(["u", "profile"]);
const kolkataDay = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

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
    const [profile, user] = await Promise.all([Profile.findOne({ userId: req.params.userId }).lean(), User.findById(req.params.userId).select("name avatarUrl").lean()]);
    if (!profile || !user) return res.status(404).json({ message: "Profile not found." });
    const skills = (profile.skills || []).map((skill) => skill.name || skill).filter(Boolean);
    const today = (profile.activityCalendar || []).find((day) => day.date === kolkataDay());
    res.json({ userId: String(user._id), name: user.name, avatar: profile.avatarUrl || user.avatarUrl || "", college: { id: profile.collegeId || null, name: profile.collegeName || profile.college || "" }, branch: profile.branch || "", graduationYear: profile.graduationYear || null, skills, projects: profile.projects ?? null, careerGoal: profile.targetRole || null, leetcode: profile.leetcodeStats ? { connected: Boolean(profile.leetcodeUsername), totalSolved: Number(profile.leetcodeStats.totalSolved) || 0, today: Number(today?.leetcode) || 0, todayLabel: "submissions today" } : { connected: false }, github: profile.githubStats ? { connected: Boolean(profile.githubUsername), today: Number(today?.github) || 0 } : { connected: false }, leaderboard: { streakDays: Number(profile.currentStreak) || 0, lastSyncedAt: profile.lastSyncedAt || null } });
  } catch (error) { next(error); }
};

function mergeActivity(githubActivity = [], leetcodeActivity = []) {
  const days = new Map();
  for (const item of githubActivity) days.set(item.date, { date: item.date, github: Number(item.count) || 0, leetcode: 0 });
  for (const item of leetcodeActivity) {
    const day = days.get(item.date) || { date: item.date, github: 0, leetcode: 0 };
    day.leetcode += Number(item.count) || 0;
    days.set(item.date, day);
  }
  return [...days.values()].map((day) => ({ ...day, total: day.github + day.leetcode })).filter((day) => day.total > 0).sort((a, b) => a.date.localeCompare(b.date));
}

function calculateStreaks(activity) {
  const activeDates = new Set(activity.filter((day) => day.total > 0).map((day) => day.date));
  let longestStreak = 0;
  let running = 0;
  let previous = null;
  for (const date of [...activeDates].sort()) {
    const current = new Date(`${date}T00:00:00Z`);
    running = previous && current - previous === 86400000 ? running + 1 : 1;
    longestStreak = Math.max(longestStreak, running);
    previous = current;
  }
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  if (!activeDates.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let currentStreak = 0;
  while (activeDates.has(cursor.toISOString().slice(0, 10))) {
    currentStreak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return { currentStreak, longestStreak };
}

function sanitizedActivity(profile, leetcodeStats) {
  const leetcodeIsValid = Boolean(leetcodeStats);
  return (profile.activityCalendar || []).map((day) => {
    const github = Number(day.github) || 0;
    const leetcode = leetcodeIsValid ? Number(day.leetcode) || 0 : 0;
    return { date: day.date, github, leetcode, total: github + leetcode };
  }).filter((day) => day.total > 0);
}

function response(profile, user) {
  const leetcodeStats = normalizeLeetcodeStats(profile.leetcodeStats);
  const activityCalendar = sanitizedActivity(profile, leetcodeStats);
  const streaks = calculateStreaks(activityCalendar);
  return {
    userId: String(user._id),
    name: user.name,
    email: user.email,
    college: profile.college || "",
    collegeId: profile.collegeId || null,
    collegeName: profile.collegeName || profile.college || "",
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
    cgpa: profile.cgpa ?? null,
    skills: profile.skills,
    githubStats: profile.githubStats || null,
    leetcodeStats,
    activityCalendar,
    syncErrors: profile.syncErrors || null,
    lastSyncedAt: profile.lastSyncedAt || null,
    onboardingCompleted: isProfileComplete(profile),
    profileStrength: profileStrength(profile),
    connections: {
      github: { connected: Boolean(profile.githubUsername || profile.githubUrl), synced: Boolean(profile.githubStats), error: profile.syncErrors?.github || null },
      leetcode: { connected: Boolean(profile.leetcodeUsername || profile.leetcodeUrl), synced: Boolean(leetcodeStats), error: profile.syncErrors?.leetcode || null },
      linkedin: { connected: Boolean(profile.linkedinUrl), synced: Boolean(profile.linkedinUrl), error: null },
    },
    ...streaks,
  };
}

function safeUsername(value, platform) {
  try { return parseProfileUsername(value, platform); }
  catch { return ""; }
}

function extractStoredActivity(profile, source) {
  return (profile.activityCalendar || []).map((day) => ({ date: day.date, count: Number(day[source]) || 0 })).filter((day) => day.count > 0);
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
    const userUpdates = {};
    if (typeof req.body.name === "string" && req.body.name.trim()) userUpdates.name = req.body.name.trim();
    if (typeof req.body.email === "string" && req.body.email.trim()) userUpdates.email = req.body.email.trim().toLowerCase();
    if (Object.keys(userUpdates).length) await User.findByIdAndUpdate(req.auth.id, { $set: userUpdates }, { runValidators: true });
    const existing = await Profile.findOne({ userId: req.auth.id });
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
    const set = {
      college: optionalText(req.body.college), collegeId: optionalText(req.body.collegeId), collegeName: optionalText(req.body.collegeName) || optionalText(req.body.college), branch: optionalText(req.body.branch), graduationYear: req.body.graduationYear === "" || req.body.graduationYear == null ? null : Number(req.body.graduationYear),
      bio: optionalText(req.body.bio), targetRole: optionalText(req.body.targetRole), targetCompany: optionalText(req.body.targetCompany),
      githubUrl: optionalText(req.body.github), githubUsername, leetcodeUrl: optionalText(req.body.leetcode), leetcodeUsername, linkedinUrl: optionalText(req.body.linkedin),
      avatarUrl: optionalText(req.body.avatar), coverUrl: optionalText(req.body.cover), projects: req.body.projects === "" || req.body.projects == null ? null : Number(req.body.projects), cgpa: req.body.cgpa === "" || req.body.cgpa == null ? null : Number(req.body.cgpa),
      skills: normalizeSkills(req.body.skills),
    };
    const githubChanged = (existing?.githubUsername || null) !== githubUsername;
    const leetcodeChanged = (existing?.leetcodeUsername || null) !== leetcodeUsername;
    if (githubChanged) set.githubStats = null;
    if (leetcodeChanged) set.leetcodeStats = null;
    if (githubChanged || leetcodeChanged) {
      const activityCalendar = (existing?.activityCalendar || []).map((day) => ({
        date: day.date,
        github: githubChanged ? 0 : Number(day.github) || 0,
        leetcode: leetcodeChanged ? 0 : Number(day.leetcode) || 0,
      })).map((day) => ({ ...day, total: day.github + day.leetcode })).filter((day) => day.total > 0);
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
    const user = await User.findById(req.auth.id);
    return res.json(response(profile, user));
  } catch (error) { return next(error); }
};

exports.syncPublicProfiles = async (req, res, next) => {
  try {
    const existing = await Profile.findOne({ userId: req.auth.id }) || new Profile({ userId: req.auth.id });
    const githubInput = req.body.githubUsername || req.body.github || existing.githubUsername || existing.githubUrl;
    const leetcodeInput = req.body.leetcodeUsername || req.body.leetcode || existing.leetcodeUsername || existing.leetcodeUrl;
    let githubUsername = "";
    let leetcodeUsername = "";
    try { if (githubInput) githubUsername = parseProfileUsername(githubInput, "github"); }
    catch (error) { return res.status(400).json({ message: error.message, source: "github" }); }
    try { if (leetcodeInput) leetcodeUsername = parseProfileUsername(leetcodeInput, "leetcode"); }
    catch (error) { return res.status(400).json({ message: error.message, source: "leetcode" }); }
    if (!githubUsername && !leetcodeUsername) return res.status(400).json({ message: "Add a GitHub or LeetCode profile first." });

    const currentYear = new Date().getUTCFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear];
    const [githubResult, leetcodeResult] = await Promise.allSettled([
      githubUsername ? getGithubActivity(githubUsername, years) : Promise.resolve(null),
      leetcodeUsername ? getLeetcodeStats(leetcodeUsername, years) : Promise.resolve(null),
    ]);
    const githubFresh = githubResult.status === "fulfilled" ? githubResult.value : null;
    const leetcodeFresh = leetcodeResult.status === "fulfilled" ? leetcodeResult.value : null;
    const syncErrors = {
      github: githubResult.status === "rejected" ? githubResult.reason.message : githubFresh?.activityError || null,
      leetcode: leetcodeResult.status === "rejected" ? leetcodeResult.reason.message : leetcodeFresh?.activityError || null,
    };

    if (!githubFresh && !leetcodeFresh) return res.status(502).json({ message: [syncErrors.github, syncErrors.leetcode].filter(Boolean).join(" ") || "Neither profile could be synchronized.", syncErrors });

    const sameGithub = existing.githubStats?.username?.toLowerCase() === githubUsername.toLowerCase();
    const existingLeetcode = normalizeLeetcodeStats(existing.leetcodeStats);
    const sameLeetcode = existingLeetcode?.username?.toLowerCase() === leetcodeUsername.toLowerCase();
    const githubStats = githubFresh || (sameGithub ? existing.githubStats : null);
    const leetcodeStats = leetcodeFresh || (sameLeetcode ? existingLeetcode : null);
    const githubActivity = githubFresh?.activity || (sameGithub ? extractStoredActivity(existing, "github") : []);
    const leetcodeActivity = leetcodeFresh?.activity || (sameLeetcode ? extractStoredActivity(existing, "leetcode") : []);
    const activityCalendar = mergeActivity(githubActivity, leetcodeActivity);
    const streaks = calculateStreaks(activityCalendar);
    const skills = buildRatedSkills(githubStats, leetcodeStats, existing.skills);
    const githubForStorage = githubStats ? { ...githubStats, activity: undefined } : null;
    const leetcodeForStorage = leetcodeStats ? { ...leetcodeStats, activity: undefined } : null;

    const set = {
      ...(githubFresh && { githubUsername: githubFresh.username, githubUrl: `https://github.com/${githubFresh.username}`, githubStats: githubForStorage, ...(githubFresh.avatar && { avatarUrl: githubFresh.avatar }) }),
      ...(leetcodeFresh && { leetcodeUsername: leetcodeFresh.username, leetcodeUrl: `https://leetcode.com/u/${leetcodeFresh.username}`, leetcodeStats: leetcodeForStorage }),
      activityCalendar,
      ...streaks,
      ...(skills.length && { skills }),
      syncErrors,
      lastSyncedAt: new Date(),
    };
    const profile = await Profile.findOneAndUpdate({ userId: req.auth.id }, { $set: set }, { new: true, upsert: true, setDefaultsOnInsert: true });
    const user = await User.findById(req.auth.id);
    return res.json({ profile: response(profile, user), syncErrors });
  } catch (error) { return next(error); }
};

exports.getSeniorMatch = async (req, res, next) => {
  try {
    const profile = await Profile.findOne({ userId: req.auth.id }).lean();
    if (!profile?.college) return res.json({ match: null, reason: "Add your college to find verified seniors from your campus." });
    const escapedCollege = profile.college.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const alumni = await Alumni.find({ college: { $regex: `^${escapedCollege}$`, $options: "i" }, verified: true, outcomeType: "placement" }).lean();
    if (!alumni.length) return res.json({ match: null, reason: "No verified senior match available yet. We're adding more alumni from your college." });
    const student = { ...profile, leetcodeStats: normalizeLeetcodeStats(profile.leetcodeStats) };
    const match = findBestSeniorMatch(student, alumni);
    return res.json({ match, reason: match ? null : "Complete your skills or sync a coding profile to calculate a senior match." });
  } catch (error) { return next(error); }
};

module.exports.calculateStreaks = calculateStreaks;
module.exports.mergeActivity = mergeActivity;
