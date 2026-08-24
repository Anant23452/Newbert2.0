const Profile = require("../Models/Profile");
const User = require("../Models/User");

function response(profile, user) {
  return { name: user.name, email: user.email, college: profile.college || "", branch: profile.branch || "", graduationYear: profile.graduationYear || "", bio: profile.bio || "", targetCompany: profile.targetCompany || "", github: profile.githubUrl || "", leetcode: profile.leetcodeUrl || "", linkedin: profile.linkedinUrl || "", avatar: profile.avatarUrl || user.avatarUrl || "", cover: profile.coverUrl || "", skills: profile.skills, githubStats: profile.githubStats || null, leetcodeStats: profile.leetcodeStats || null, lastSyncedAt: profile.lastSyncedAt || null, currentStreak: profile.currentStreak, longestStreak: profile.longestStreak };
}

function usernameFromUrl(value, provider) {
  if (typeof value !== "string") return "";
  const cleaned = value.trim().replace(/\/$/, "");
  const match = cleaned.match(new RegExp(`${provider}\\.com/([^/?#]+)`, "i"));
  return match ? match[1] : cleaned.replace(/^@/, "");
}

async function fetchGitHub(username) {
  const result = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers: { Accept: "application/vnd.github+json", "User-Agent": "Newbert" } });
  if (!result.ok) throw new Error("GitHub profile could not be found.");
  const user = await result.json();
  const reposResponse = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`, { headers: { Accept: "application/vnd.github+json", "User-Agent": "Newbert" } });
  const repos = reposResponse.ok ? await reposResponse.json() : [];
  const languageCounts = repos.reduce((counts, repo) => { if (repo.language) counts[repo.language] = (counts[repo.language] || 0) + 1; return counts; }, {});
  const languages = Object.keys(languageCounts).sort((a, b) => languageCounts[b] - languageCounts[a]).slice(0, 12);
  return { username: user.login, avatar: user.avatar_url, publicRepos: user.public_repos, followers: user.followers, following: user.following, languages, languageCounts, updatedAt: new Date().toISOString() };
}

async function fetchLeetCode(username) {
  const result = await fetch("https://leetcode.com/graphql", { method: "POST", headers: { "Content-Type": "application/json", Referer: "https://leetcode.com" }, body: JSON.stringify({ query: "query user($username: String!) { matchedUser(username: $username) { username profile { ranking } submitStats: submitStatsGlobal { acSubmissionNum { difficulty count } } languageProblemCount { languageName problemsSolved } } }", variables: { username } }) });
  if (!result.ok) throw new Error("LeetCode statistics could not be fetched.");
  const user = (await result.json()).data?.matchedUser;
  if (!user) throw new Error("LeetCode profile could not be found.");
  const counts = Object.fromEntries(user.submitStats.acSubmissionNum.map((item) => [item.difficulty.toLowerCase(), item.count]));
  const languageCounts = Object.fromEntries((user.languageProblemCount || []).filter((item) => item.problemsSolved > 0).map((item) => [item.languageName, item.problemsSolved]));
  return { username: user.username, ranking: user.profile.ranking, solved: counts.all || 0, easy: counts.easy || 0, medium: counts.medium || 0, hard: counts.hard || 0, languageCounts, updatedAt: new Date().toISOString() };
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
    const profile = await Profile.findOneAndUpdate({ userId: req.auth.id }, { $set: { ...(github && { githubUrl: `https://github.com/${github}` }), ...(leetcode && { leetcodeUrl: `https://leetcode.com/${leetcode}` }), ...(githubStats && { githubStats }), ...(leetcodeStats && { leetcodeStats }), ...(githubStats?.avatar && { avatarUrl: githubStats.avatar }), ...(skills.length && { skills }), lastSyncedAt: new Date() } }, { new: true, upsert: true, setDefaultsOnInsert: true });
    const user = await User.findById(req.auth.id);
    return res.json({ profile: response(profile, user), errors });
  } catch (error) { return next(error); }
};
