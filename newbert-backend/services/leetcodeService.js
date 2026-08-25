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
      "query profile($username:String!){matchedUser(username:$username){username profile{ranking} submitStats:submitStatsGlobal{acSubmissionNum{difficulty count}} languageProblemCount{languageName problemsSolved}} userContestRanking(username:$username){attendedContestsCount rating globalRanking topPercentage}}",
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
  const activity = calendarResults.filter((result) => result.status === "fulfilled").flatMap((result) => result.value);
  const calendarFailure = calendarResults.find((result) => result.status === "rejected");

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
    activityError: calendarFailure?.reason?.message || null,
    lastSyncedAt: new Date().toISOString(),
  };
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

module.exports = { LEETCODE_GRAPHQL_URL, getLeetcodeStats };
