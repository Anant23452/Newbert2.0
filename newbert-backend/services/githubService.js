async function getGithubActivity(username, years) {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "Newbert", ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }) };
  const userResponse = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers });
  if (userResponse.status === 404) throw new Error("GitHub profile not found. Check the username and try again.");
  if (!userResponse.ok) throw new Error(`GitHub profile sync failed (${userResponse.status}).`);
  const user = await userResponse.json();

  const reposResponse = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`, { headers });
  if (!reposResponse.ok) throw new Error(`GitHub repository sync failed (${reposResponse.status}).`);
  const repos = await reposResponse.json();
  const languageCounts = repos.reduce((counts, repo) => {
    if (repo.language && !repo.fork) counts[repo.language] = (counts[repo.language] || 0) + 1;
    return counts;
  }, {});
  const languages = Object.keys(languageCounts).sort((a, b) => languageCounts[b] - languageCounts[a]).slice(0, 12);

  let activity = [];
  let activityError = null;
  if (!process.env.GITHUB_TOKEN) {
    activityError = "GitHub activity is unavailable until GITHUB_TOKEN is configured in Render.";
  } else {
    const calendarResults = await Promise.allSettled(years.map((year) => fetchContributionYear(user.login, year)));
    activity = calendarResults.filter((result) => result.status === "fulfilled").flatMap((result) => result.value);
    const failure = calendarResults.find((result) => result.status === "rejected");
    if (failure) activityError = failure.reason.message;
  }

  return {
    username: user.login,
    avatar: user.avatar_url,
    publicRepos: user.public_repos,
    followers: user.followers,
    following: user.following,
    languages,
    languageCounts,
    activity,
    activityError,
    lastSyncedAt: new Date().toISOString(),
  };
}

async function fetchContributionYear(username, year) {
  const currentYear = new Date().getUTCFullYear();
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Newbert", Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
    body: JSON.stringify({
      query: "query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}",
      variables: { login: username, from: `${year}-01-01T00:00:00Z`, to: year === currentYear ? new Date().toISOString() : `${year}-12-31T23:59:59Z` },
    }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length || !payload.data?.user) throw new Error(payload.errors?.[0]?.message || "GitHub contribution calendar could not be fetched.");
  return payload.data.user.contributionsCollection.contributionCalendar.weeks
    .flatMap((week) => week.contributionDays)
    .map((day) => ({ date: day.date, count: Number(day.contributionCount) || 0 }));
}

module.exports = { getGithubActivity };
