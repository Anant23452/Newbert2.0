const { toActivityDate, getKolkataToday, calculateStreaks, KOLKATA_TIMEZONE } = require("../utils/dateNormalization");

/**
 * Normalizes a single day item into Newbert's canonical activity structure.
 */
function normalizeDailyItem(day = {}, timezone = KOLKATA_TIMEZONE) {
  const date = toActivityDate(day.date, timezone) || day.date || "";

  // GitHub metrics
  const githubCommits = Number(
    day.githubCommits != null
      ? day.githubCommits
      : day.github?.commits != null
      ? day.github.commits
      : day.commits != null
      ? day.commits
      : day.github != null
      ? day.github
      : 0
  ) || 0;

  const githubPullRequests = Number(
    day.githubPullRequests != null
      ? day.githubPullRequests
      : day.github?.pullRequests != null
      ? day.github.pullRequests
      : day.pullRequests != null
      ? day.pullRequests
      : 0
  ) || 0;

  const githubIssues = Number(
    day.githubIssues != null
      ? day.githubIssues
      : day.github?.issues != null
      ? day.github.issues
      : day.issues != null
      ? day.issues
      : 0
  ) || 0;

  const githubRepositoriesCreated = Number(
    day.githubRepositoriesCreated != null
      ? day.githubRepositoriesCreated
      : day.repositoriesCreated != null
      ? day.repositoriesCreated
      : 0
  ) || 0;

  const githubTotal = Number(
    day.github != null && typeof day.github === "number"
      ? day.github
      : day.github?.total != null
      ? day.github.total
      : githubCommits
  ) || githubCommits;

  // LeetCode metrics
  const acceptedProblems = Array.isArray(day.leetcodeAcceptedProblems)
    ? [...new Set(day.leetcodeAcceptedProblems.filter(Boolean))]
    : Array.isArray(day.leetcode?.acceptedProblems)
    ? [...new Set(day.leetcode.acceptedProblems.filter(Boolean))]
    : Array.isArray(day.acceptedProblems)
    ? [...new Set(day.acceptedProblems.filter(Boolean))]
    : [];

  const leetcodeSolved = Number(
    day.leetcodeAccepted != null
      ? day.leetcodeAccepted
      : day.leetcode?.solved != null
      ? day.leetcode.solved
      : acceptedProblems.length > 0
      ? acceptedProblems.length
      : day.leetcode != null && typeof day.leetcode === "number"
      ? day.leetcode
      : day.count != null
      ? day.count
      : 0
  ) || 0;

  const leetcodeSubmissions = Number(
    day.leetcodeSubmissions != null
      ? day.leetcodeSubmissions
      : day.leetcode?.submissions != null
      ? day.leetcode.submissions
      : day.leetcode != null && typeof day.leetcode === "number"
      ? day.leetcode
      : day.count != null
      ? day.count
      : 0
  ) || 0;

  const projectActivity = Number(
    day.projectActivity != null
      ? day.projectActivity
      : day.project != null
      ? day.project
      : day.projects != null && typeof day.projects === "number"
      ? day.projects
      : 0
  ) || 0;

  // Canonical verified activity total: commits + solved problems + verified project work
  const verifiedGithub = githubCommits > 0 ? githubCommits : githubTotal;
  const verifiedLeetcode = leetcodeSolved > 0 ? leetcodeSolved : leetcodeSubmissions;
  const totalVerifiedActivity = verifiedGithub + verifiedLeetcode + projectActivity;

  return {
    date,
    github: verifiedGithub,
    githubCommits,
    githubPullRequests,
    githubIssues,
    githubRepositoriesCreated,
    leetcode: leetcodeSubmissions > 0 ? leetcodeSubmissions : verifiedLeetcode,
    leetcodeAccepted: verifiedLeetcode,
    leetcodeAcceptedProblems: acceptedProblems,
    projectActivity,
    total: totalVerifiedActivity,
    totalVerifiedActivity,
    breakdown: {
      github: {
        commits: githubCommits,
        pullRequests: githubPullRequests,
        issues: githubIssues,
        total: verifiedGithub,
      },
      leetcode: {
        solved: verifiedLeetcode,
        acceptedProblems,
        submissions: leetcodeSubmissions,
      },
    },
  };
}

/**
 * Merges stored activity with freshly fetched GitHub and LeetCode activity records.
 * Historical days are strictly preserved.
 */
function mergeActivitySources({
  storedActivity = [],
  freshGithub = [],
  freshLeetcode = [],
  timezone = KOLKATA_TIMEZONE,
} = {}) {
  const daysMap = new Map();

  // 1. Seed with existing stored activity to protect history
  for (const raw of storedActivity || []) {
    const item = normalizeDailyItem(raw, timezone);
    if (item.date) {
      daysMap.set(item.date, item);
    }
  }

  // 2. Merge fresh GitHub activity (e.g. recent events or calendar)
  for (const raw of freshGithub || []) {
    const date = toActivityDate(raw.date, timezone) || raw.date;
    if (!date) continue;

    const existing = daysMap.get(date) || normalizeDailyItem({ date }, timezone);
    const incomingCommits = Number(raw.commits != null ? raw.commits : raw.count || 0) || 0;
    const incomingTotal = Number(raw.count != null ? raw.count : incomingCommits) || incomingCommits;

    const mergedCommits = Math.max(existing.githubCommits || 0, incomingCommits);
    const mergedPullRequests = Math.max(existing.githubPullRequests || 0, Number(raw.pullRequests) || 0);
    const mergedIssues = Math.max(existing.githubIssues || 0, Number(raw.issues) || 0);
    const mergedRepositoriesCreated = Math.max(existing.githubRepositoriesCreated || 0, Number(raw.repositoriesCreated) || 0);
    const mergedTotal = Math.max(existing.github || 0, incomingTotal, mergedCommits);

    const merged = normalizeDailyItem({
      ...existing,
      date,
      github: mergedTotal,
      githubCommits: mergedCommits,
      githubPullRequests: mergedPullRequests,
      githubIssues: mergedIssues,
      githubRepositoriesCreated: mergedRepositoriesCreated,
      leetcode: existing.leetcode,
      leetcodeAccepted: existing.leetcodeAccepted,
      leetcodeAcceptedProblems: existing.leetcodeAcceptedProblems,
      projectActivity: existing.projectActivity,
    }, timezone);

    daysMap.set(date, merged);
  }

  // 3. Merge fresh LeetCode activity
  for (const raw of freshLeetcode || []) {
    const date = toActivityDate(raw.date, timezone) || raw.date;
    if (!date) continue;

    const existing = daysMap.get(date) || normalizeDailyItem({ date }, timezone);
    const incomingAccepted = Array.isArray(raw.acceptedProblems) ? raw.acceptedProblems : [];
    const mergedAccepted = [...new Set([...(existing.leetcodeAcceptedProblems || []), ...incomingAccepted])];

    const incomingSolved = Number(raw.solved != null ? raw.solved : raw.leetcodeAccepted != null ? raw.leetcodeAccepted : mergedAccepted.length || raw.count || 0) || 0;
    const incomingSubmissions = Number(raw.submissions != null ? raw.submissions : raw.count || incomingSolved) || 0;

    const mergedSolved = Math.max(existing.leetcodeAccepted || 0, incomingSolved, mergedAccepted.length);
    const mergedSubmissions = Math.max(existing.leetcode || 0, incomingSubmissions, mergedSolved);

    const merged = normalizeDailyItem({
      ...existing,
      date,
      github: existing.github,
      githubCommits: existing.githubCommits,
      githubPullRequests: existing.githubPullRequests,
      githubIssues: existing.githubIssues,
      githubRepositoriesCreated: existing.githubRepositoriesCreated,
      leetcode: mergedSubmissions,
      leetcodeAccepted: mergedSolved,
      leetcodeAcceptedProblems: mergedAccepted,
      projectActivity: existing.projectActivity,
    }, timezone);

    daysMap.set(date, merged);
  }

  // 4. Return chronological active days
  return [...daysMap.values()]
    .filter((day) => day.totalVerifiedActivity > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Returns canonical normalized user activity summary and calendar.
 */
function getNormalizedUserActivity(profile = {}, timezone = KOLKATA_TIMEZONE) {
  const calendar = (profile.activityCalendar || []).map((day) => normalizeDailyItem(day, timezone));
  const streaks = calculateStreaks(calendar);
  const todayDate = getKolkataToday(timezone);
  const todayItem = calendar.find((d) => d.date === todayDate) || normalizeDailyItem({ date: todayDate }, timezone);

  const totalVerifiedActivities = calendar.reduce((sum, d) => sum + d.totalVerifiedActivity, 0);

  return {
    todayDate,
    totalVerifiedActivities,
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
    today: {
      date: todayDate,
      githubCommits: todayItem.githubCommits,
      leetcodeSolved: todayItem.leetcodeAccepted,
      leetcodeSubmissions: todayItem.leetcode,
      total: todayItem.totalVerifiedActivity,
    },
    calendar,
  };
}

module.exports = {
  normalizeDailyItem,
  mergeActivitySources,
  getNormalizedUserActivity,
};
