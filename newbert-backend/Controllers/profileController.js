const Profile = require("../Models/Profile");
const User = require("../Models/User");

function response(profile, user) {
  return { name: user.name, email: user.email, college: profile.college || "", branch: profile.branch || "", graduationYear: profile.graduationYear || "", bio: profile.bio || "", targetCompany: profile.targetCompany || "", github: profile.githubUrl || "", leetcode: profile.leetcodeUrl || "", linkedin: profile.linkedinUrl || "", avatar: profile.avatarUrl || user.avatarUrl || "", cover: profile.coverUrl || "", skills: profile.skills, githubStats: profile.githubStats || null, leetcodeStats: profile.leetcodeStats || null, activityCalendar: profile.activityCalendar || [], lastSyncedAt: profile.lastSyncedAt || null, currentStreak: profile.currentStreak, longestStreak: profile.longestStreak };
}

function usernameFromUrl(value, provider) {
  if (typeof value !== "string") return "";
  const cleaned = value.trim().replace(/\/$/, "");
  const match = cleaned.match(new RegExp(`${provider}\\.com/([^/?#]+)`, "i"));
  return match ? match[1] : cleaned.replace(/^@/, "");
}

async function fetchGitHub(username) {
  const restHeaders = { Accept: "application/vnd.github+json", "User-Agent": "Newbert", ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }) };
  const result = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers: restHeaders });
  if (!result.ok) throw new Error("GitHub profile could not be found.");
  const user = await result.json();
  const reposResponse = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`, { headers: restHeaders });
  const repos = reposResponse.ok ? await reposResponse.json() : [];
  const languageCounts = repos.reduce((counts, repo) => { if (repo.language) counts[repo.language] = (counts[repo.language] || 0) + 1; return counts; }, {});
  const languages = Object.keys(languageCounts).sort((a, b) => languageCounts[b] - languageCounts[a]).slice(0, 12);
  if (!process.env.GITHUB_TOKEN) throw new Error("GitHub activity needs GITHUB_TOKEN in Render.");
  const currentYear = new Date().getUTCFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear];
  const calendars = await Promise.all(years.map(async (year) => {
    const to = year === currentYear ? new Date().toISOString() : `${year}-12-31T23:59:59Z`;
    const response = await fetch("https://api.github.com/graphql", { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": "Newbert", Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }, body: JSON.stringify({ query: "query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}", variables: { login: user.login, from: `${year}-01-01T00:00:00Z`, to } }) });
    const payload = await response.json();
    if (!response.ok || payload.errors?.length || !payload.data?.user) throw new Error(payload.errors?.[0]?.message || "GitHub contribution calendar could not be fetched.");
    return payload.data.user.contributionsCollection.contributionCalendar.weeks.flatMap((week) => week.contributionDays).map((day) => ({ date: day.date, count: day.contributionCount }));
  }));
  return { username: user.login, avatar: user.avatar_url, publicRepos: user.public_repos, followers: user.followers, following: user.following, languages, languageCounts, activity: calendars.flat(), updatedAt: new Date().toISOString() };
}

async function fetchLeetCode(username) {
  const currentYear = new Date().getUTCFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear];
  const results = await Promise.all(years.map(async (year) => {
    const result = await fetch("https://leetcode.com/graphql", { method: "POST", headers: { "Content-Type": "application/json", Referer: "https://leetcode.com", "User-Agent": "Newbert" }, body: JSON.stringify({ query: "query user($username: String!, $year: Int) { matchedUser(username: $username) { username profile { ranking } submitStats: submitStatsGlobal { acSubmissionNum { difficulty count } } languageProblemCount { languageName problemsSolved } userCalendar(year: $year) { submissionCalendar } } }", variables: { username, year } }) });
    if (!result.ok) throw new Error("LeetCode statistics could not be fetched.");
    const payload = await result.json();
    if (payload.errors?.length) throw new Error(payload.errors[0].message);
    return payload.data?.matchedUser;
  }));
  const user = results.find(Boolean);
  if (!user) throw new Error("LeetCode profile could not be found.");
  const counts = Object.fromEntries(user.submitStats.acSubmissionNum.map((item) => [item.difficulty.toLowerCase(), item.count]));
  const languageCounts = Object.fromEntries((user.languageProblemCount || []).filter((item) => item.problemsSolved > 0).map((item) => [item.languageName, item.problemsSolved]));
  const activity = results.flatMap((item) => {
    try {
      const calendar = JSON.parse(item?.userCalendar?.submissionCalendar || "{}");
      return Object.entries(calendar).map(([timestamp, count]) => ({ date: new Date(Number(timestamp) * 1000).toISOString().slice(0, 10), count: Number(count) || 0 }));
    } catch { return []; }
  });
  return { username: user.username, ranking: user.profile.ranking, solved: counts.all || 0, easy: counts.easy || 0, medium: counts.medium || 0, hard: counts.hard || 0, languageCounts, activity, updatedAt: new Date().toISOString() };
}

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
  const activeDates = new Set(activity.map((day) => day.date));
  let longestStreak = 0;
  let running = 0;
  let previous = null;
  for (const date of [...activeDates].sort()) {
    const current = new Date(`${date}T00:00:00Z`);
    running = previous && current - previous === 86400000 ? running + 1 : 1;
    longestStreak = Math.max(longestStreak, running);
    previous = current;
  }
  let cursor = new Date(); cursor.setUTCHours(0, 0, 0, 0);
  if (!activeDates.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let currentStreak = 0;
  while (activeDates.has(cursor.toISOString().slice(0, 10))) { currentStreak++; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  return { currentStreak, longestStreak };
}

exports.getMyProfile = async (req, res, next) => {
  try {
    const [user, profile] = await Promise.all([User.findById(req.auth.id), Profile.findOne({ userId: req.auth.id })]);
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.json(response(profile || new Profile({ userId: user._id }), user));
  } catch (error) { return next(error); }
};

exports.updateMyProfile = async (req, res, next) => {
  try {
    const userUpdates = {};
    if (typeof req.body.name === "string" && req.body.name.trim()) userUpdates.name = req.body.name.trim();
    if (typeof req.body.email === "string" && req.body.email.trim()) userUpdates.email = req.body.email.trim().toLowerCase();
    if (Object.keys(userUpdates).length) await User.findByIdAndUpdate(req.auth.id, { $set: userUpdates }, { runValidators: true });
    const profile = await Profile.findOneAndUpdate({ userId: req.auth.id }, { $set: { college: req.body.college, branch: req.body.branch, graduationYear: req.body.graduationYear, bio: req.body.bio, targetCompany: req.body.targetCompany, githubUrl: req.body.github, leetcodeUrl: req.body.leetcode, linkedinUrl: req.body.linkedin, avatarUrl: req.body.avatar, coverUrl: req.body.cover, skills: req.body.skills } }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
    const user = await User.findById(req.auth.id);
    return res.json(response(profile, user));
  } catch (error) { return next(error); }
};

exports.syncPublicProfiles = async (req, res, next) => {
  try {
    const github = usernameFromUrl(req.body.github, "github");
    const leetcode = usernameFromUrl(req.body.leetcode, "leetcode");
    if (!github && !leetcode) return res.status(400).json({ message: "Add a GitHub or LeetCode profile first." });
    const [githubResult, leetcodeResult] = await Promise.allSettled([github ? fetchGitHub(github) : null, leetcode ? fetchLeetCode(leetcode) : null]);
    const errors = [githubResult, leetcodeResult].filter((item) => item.status === "rejected").map((item) => item.reason.message);
    const githubStats = githubResult.status === "fulfilled" ? githubResult.value : undefined;
    const leetcodeStats = leetcodeResult.status === "fulfilled" ? leetcodeResult.value : undefined;
    const ratedSkills = new Map();
    for (const [name, count] of Object.entries(githubStats?.languageCounts || {})) ratedSkills.set(name, { name, score: Math.min(95, 40 + count * 12), source: "github" });
    for (const [name, count] of Object.entries(leetcodeStats?.languageCounts || {})) {
      const score = Math.min(100, 35 + count * 4);
      if (!ratedSkills.has(name) || ratedSkills.get(name).score < score) ratedSkills.set(name, { name, score, source: "leetcode" });
    }
    if (leetcodeStats?.solved) {
      ratedSkills.set("DSA", { name: "DSA", score: Math.min(100, 30 + Math.round(leetcodeStats.solved * 0.35)), source: "leetcode" });
      ratedSkills.set("Problem Solving", { name: "Problem Solving", score: Math.min(100, 30 + Math.round(leetcodeStats.solved * 0.35)), source: "leetcode" });
    }
    const skills = [...ratedSkills.values()].sort((a, b) => b.score - a.score);
    const activityCalendar = mergeActivity(githubStats?.activity, leetcodeStats?.activity);
    const streaks = calculateStreaks(activityCalendar);
    if (!githubStats && !leetcodeStats) return res.status(502).json({ message: errors.join(" ") || "Neither profile could be synchronized." });
    const profile = await Profile.findOneAndUpdate({ userId: req.auth.id }, { $set: { ...(github && { githubUrl: `https://github.com/${github}` }), ...(leetcode && { leetcodeUrl: `https://leetcode.com/${leetcode}` }), ...(githubStats && { githubStats }), ...(leetcodeStats && { leetcodeStats }), activityCalendar, ...streaks, ...(githubStats?.avatar && { avatarUrl: githubStats.avatar }), ...(skills.length && { skills }), lastSyncedAt: new Date() } }, { new: true, upsert: true, setDefaultsOnInsert: true });
    const user = await User.findById(req.auth.id);
    return res.json({ profile: response(profile, user), errors });
  } catch (error) { return next(error); }
};
