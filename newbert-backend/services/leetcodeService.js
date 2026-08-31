const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";

async function requestLeetcode(query, variables) {
  const response = await fetch(LEETCODE_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Referer: "https://leetcode.com", "User-Agent": "Newbert" },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`LeetCode sync failed (${response.status}).`);
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(payload.errors[0].message);
  return payload.data;
}

async function getLeetcodeStats(username, years) {
  let data;
  try {
    data = await requestLeetcode(
      "query profile($username:String!){matchedUser(username:$username){username profile{ranking} submitStats:submitStatsGlobal{acSubmissionNum{difficulty count}} languageProblemCount{languageName problemsSolved}} userContestRanking(username:$username){attendedContestsCount rating globalRanking topPercentage} recentAcSubmissionList(username:$username,limit:100){titleSlug timestamp}}",
      { username },
    );
  } catch (error) {
    if (/does not exist|not found/i.test(error.message)) throw new Error("LeetCode profile not found. Check the username and try again.");
    throw error;
  }
  const user = data.matchedUser;
  if (!user) throw new Error("LeetCode profile not found. Check the username and try again.");

  const accepted = Object.fromEntries((user.submitStats?.acSubmissionNum || []).map((item) => [item.difficulty.toLowerCase(), Number(item.count) || 0]));
  const languageCounts = Object.fromEntries((user.languageProblemCount || []).filter((item) => item.problemsSolved > 0).map((item) => [item.languageName, Number(item.problemsSolved)]));
  const calendarResults = await Promise.allSettled(years.map((year) => fetchSubmissionYear(user.username, year)));
  const activityByDate = new Map(calendarResults.filter((result) => result.status === "fulfilled").flatMap((result) => result.value).map((item) => [item.date, item]));
  for (const submission of data.recentAcSubmissionList || []) {
    const date = kolkataDate(Number(submission.timestamp) * 1000);
    const item = activityByDate.get(date) || { date, count: 0, acceptedProblems: [] };
    item.acceptedProblems = [...new Set([...(item.acceptedProblems || []), submission.titleSlug].filter(Boolean))];
    activityByDate.set(date, item);
  }
  const activity = [...activityByDate.values()];
  const calendarFailure = calendarResults.find((result) => result.status === "rejected");
  const recentSlugs = [...new Set((data.recentAcSubmissionList || []).map((item) => item.titleSlug).filter(Boolean))].slice(0, 30);
  let solvedProblems = []; let topicEvidenceError = null;
  try { solvedProblems = recentSlugs.length ? await fetchProblemTopics(recentSlugs) : []; }
  catch (error) { topicEvidenceError = error.message; }

  return {
    username: user.username,
    totalSolved: accepted.all ?? 0,
    easySolved: accepted.easy ?? 0,
    mediumSolved: accepted.medium ?? 0,
    hardSolved: accepted.hard ?? 0,
    ranking: user.profile?.ranking ?? null,
    contestRating: data.userContestRanking?.rating ?? null,
    attendedContests: data.userContestRanking?.attendedContestsCount ?? null,
    languageCounts,
    activity,
    solvedProblems,
    topicEvidenceScope: solvedProblems.length ? "limited_recent_accepted_feed" : "unavailable",
    topicEvidenceError,
    acceptedActivityAvailable: true,
    acceptedActivityLimit: 100,
    activityError: calendarFailure?.reason?.message || null,
    lastSyncedAt: new Date().toISOString(),
  };
}

async function fetchProblemTopics(slugs) {
  const fields = slugs.map((slug, index) => `q${index}: question(titleSlug:${JSON.stringify(slug)}){questionId frontendQuestionId title titleSlug topicTags{name slug}}`).join(" ");
  const data = await requestLeetcode(`query topics{${fields}}`, {});
  return Object.values(data || {}).filter(Boolean).map((item) => ({ id: item.frontendQuestionId || item.questionId, questionId: item.questionId, title: item.title, titleSlug: item.titleSlug, topics: (item.topicTags || []).flatMap((topic) => [topic.slug, topic.name]).filter(Boolean) }));
}

function kolkataDate(timestamp) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(timestamp));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

async function fetchSubmissionYear(username, year) {
  const data = await requestLeetcode(
    "query calendar($username:String!,$year:Int){matchedUser(username:$username){userCalendar(year:$year){submissionCalendar}}}",
    { username, year },
  );
  if (!data.matchedUser) throw new Error("LeetCode profile not found. Check the username and try again.");
  const raw = data.matchedUser.userCalendar?.submissionCalendar;
  if (!raw) return [];
  let calendar;
  try { calendar = JSON.parse(raw); }
  catch { throw new Error("LeetCode returned an invalid activity calendar."); }
  return Object.entries(calendar).map(([timestamp, count]) => ({ date: new Date(Number(timestamp) * 1000).toISOString().slice(0, 10), count: Number(count) || 0 }));
}

module.exports = { LEETCODE_GRAPHQL_URL, fetchProblemTopics, getLeetcodeStats };
