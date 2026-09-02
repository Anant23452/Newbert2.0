const { analyzeRepositorySnapshot } = require("./skillEvidenceService");
const { kolkataDate, getKolkataToday } = require("../utils/dateNormalization");

const SCAN_LIMITS = Object.freeze({ repositories: 5, filesPerRepository: 20, maxFileBytes: 100000 });
const IGNORE_PATH = /(^|\/)(node_modules|dist|build|vendor|coverage|\.next|generated)(\/|$)|(?:package-lock|yarn\.lock|pnpm-lock)/i;
const SOURCE_FILE = /(?:README(?:\.[a-z0-9]+)?|package\.json|requirements\.txt|pyproject\.toml|\.(?:js|jsx|ts|tsx|py|sql))$/i;

async function githubJson(url, headers) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`GitHub evidence request failed (${response.status}).`);
  return response.json();
}

async function scanRepository(repo, headers) {
  const tree = await githubJson(`https://api.github.com/repos/${repo.full_name}/git/trees/${encodeURIComponent(repo.default_branch)}?recursive=1`, headers);
  const candidates = (tree.tree || []).filter((item) => item.type === "blob" && item.size <= SCAN_LIMITS.maxFileBytes && SOURCE_FILE.test(item.path) && !IGNORE_PATH.test(item.path)).slice(0, SCAN_LIMITS.filesPerRepository);
  const results = await Promise.allSettled(candidates.map((item) => githubJson(`https://api.github.com/repos/${repo.full_name}/contents/${encodeURIComponent(item.path)}`, headers)));
  const files = candidates.map((item) => item.path); let content = ""; let dependencies = {}; let devDependencies = {};
  results.forEach((result, index) => {
    if (result.status !== "fulfilled" || result.value.encoding !== "base64") return;
    const decoded = Buffer.from(result.value.content, "base64").toString("utf8"); content += `\n${decoded.slice(0, SCAN_LIMITS.maxFileBytes)}`;
    if (/package\.json$/i.test(candidates[index].path)) { try { const manifest = JSON.parse(decoded); dependencies = { ...dependencies, ...(manifest.dependencies || {}) }; devDependencies = { ...devDependencies, ...(manifest.devDependencies || {}) }; } catch {} }
  });
  return { name: repo.name, url: repo.html_url, liveUrl: repo.homepage || null, description: repo.description || null, language: repo.language || null, hasReadme: files.some((file) => /(^|\/)readme/i.test(file)), filesInspected: files.length, ...analyzeRepositorySnapshot({ dependencies, devDependencies, files, content }) };
}

async function fetchRecentEvents(username, headers) {
  try {
    const eventsResponse = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events?per_page=100`, { headers });
    if (!eventsResponse.ok) return [];
    const events = await eventsResponse.json();
    if (!Array.isArray(events)) return [];

    const activityByDate = new Map();
    for (const event of events) {
      if (!event.created_at) continue;
      const date = kolkataDate(event.created_at);
      if (!date) continue;

      let commits = 0;
      let count = 0;
      let pullRequests = 0;
      let issues = 0;
      let repositoriesCreated = 0;
      if (event.type === "PushEvent") {
        commits = event.payload?.commits?.length || event.payload?.size || event.payload?.distinct_size || 1;
        count = commits;
      } else if (event.type === "PullRequestEvent") {
        count = 1;
        pullRequests = 1;
      } else if (event.type === "IssuesEvent") {
        count = 1;
        issues = 1;
      } else if (event.type === "CreateEvent" && event.payload?.ref_type === "repository") {
        count = 1;
        repositoriesCreated = 1;
      }
      if (!count) continue;

      const existing = activityByDate.get(date) || { date, count: 0, commits: 0, pullRequests: 0, issues: 0, repositoriesCreated: 0 };
      existing.count += count;
      existing.commits += commits;
      existing.pullRequests += pullRequests;
      existing.issues += issues;
      existing.repositoriesCreated += repositoriesCreated;
      activityByDate.set(date, existing);
    }

    return [...activityByDate.values()];
  } catch {
    return [];
  }
}

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
  const scans = await Promise.allSettled(repos.filter((repo) => !repo.fork && !repo.archived).slice(0, SCAN_LIMITS.repositories).map((repo) => scanRepository(repo, headers)));
  const repositories = scans.filter((result) => result.status === "fulfilled").map((result) => result.value);

  let activityMap = new Map();
  let activityError = null;
  let commitActivityAvailable = false;

  // 1. Fetch real-time REST events (normalized to Asia/Kolkata date)
  const recentEvents = await fetchRecentEvents(user.login, headers);
  if (recentEvents.length > 0) {
    commitActivityAvailable = true;
    for (const ev of recentEvents) {
        activityMap.set(ev.date, { ...ev });
    }
  }

  // 2. Fetch GraphQL contribution calendar if token available
  if (process.env.GITHUB_TOKEN) {
    const calendarResults = await Promise.allSettled(years.map((year) => fetchContributionYear(user.login, year)));
    const calendarDays = calendarResults.filter((result) => result.status === "fulfilled").flatMap((result) => result.value);
    if (calendarDays.length > 0) {
      commitActivityAvailable = true;
      for (const day of calendarDays) {
        const existing = activityMap.get(day.date);
        const count = Math.max(day.count || 0, existing?.count || 0);
        const commits = Math.max(day.commits || 0, existing?.commits || 0);
        activityMap.set(day.date, {
          date: day.date,
          count: Math.max(count, commits),
          commits,
          pullRequests: existing?.pullRequests || 0,
          issues: existing?.issues || 0,
          repositoriesCreated: existing?.repositoriesCreated || 0,
        });
      }
    }
    const failure = calendarResults.find((result) => result.status === "rejected");
    if (failure && !calendarDays.length && !recentEvents.length) activityError = failure.reason.message;
  } else if (!recentEvents.length) {
    activityError = "GitHub activity is unavailable until GITHUB_TOKEN is configured in Render.";
  }

  const activity = [...activityMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  return {
    username: user.login,
    avatar: user.avatar_url,
    publicRepos: user.public_repos,
    followers: user.followers,
    following: user.following,
    languages,
    languageCounts,
    repositories,
    repositoryEvidenceError: scans.some((result) => result.status === "rejected") ? "Some repositories could not be inspected; available evidence was retained." : null,
    scanLimits: SCAN_LIMITS,
    activity,
    activityError,
    commitActivityAvailable,
    contributionActivityAvailable: commitActivityAvailable,
    lastSyncedAt: new Date().toISOString(),
  };
}

async function fetchContributionYear(username, year) {
  const currentYear = Number(getKolkataToday().slice(0, 4));
  const toDate = year === currentYear
    ? new Date(Date.now() + 86400000 * 2).toISOString()
    : `${year}-12-31T23:59:59Z`;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Newbert", Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
    body: JSON.stringify({
      query: "query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){contributionCalendar{weeks{contributionDays{date contributionCount}}}commitContributionsByRepository(maxRepositories:100){contributions(first:100){nodes{occurredAt commitCount}}}}}}",
      variables: { login: username, from: `${year}-01-01T00:00:00Z`, to: toDate },
    }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length || !payload.data?.user) throw new Error(payload.errors?.[0]?.message || "GitHub contribution calendar could not be fetched.");
  const collection = payload.data.user.contributionsCollection;
  const commitsByDate = new Map();
  for (const repository of collection.commitContributionsByRepository || []) {
    for (const contribution of repository.contributions?.nodes || []) {
      const date = contribution.occurredAt ? kolkataDate(contribution.occurredAt) : "";
      if (date) commitsByDate.set(date, (commitsByDate.get(date) || 0) + (Number(contribution.commitCount) || 0));
    }
  }
  return collection.contributionCalendar.weeks
    .flatMap((week) => week.contributionDays)
    .map((day) => {
      // GitHub's contribution calendar already supplies a calendar date, not a timestamp.
      const istDate = day.date;
      const count = Number(day.contributionCount) || 0;
      const commits = commitsByDate.get(istDate) || 0;
      return { date: istDate, count: Math.max(count, commits), commits };
    });
}

module.exports = { getGithubActivity, scanRepository, fetchRecentEvents, SCAN_LIMITS };
