const { analyzeRepositorySnapshot } = require("./skillEvidenceService");

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

  let activity = [];
  let activityError = null;
  let commitActivityAvailable = false;
  if (!process.env.GITHUB_TOKEN) {
    activityError = "GitHub activity is unavailable until GITHUB_TOKEN is configured in Render.";
  } else {
    const calendarResults = await Promise.allSettled(years.map((year) => fetchContributionYear(user.login, year)));
    activity = calendarResults.filter((result) => result.status === "fulfilled").flatMap((result) => result.value);
    commitActivityAvailable = calendarResults.some((result) => result.status === "fulfilled");
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
  const currentYear = new Date().getUTCFullYear();
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Newbert", Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
    body: JSON.stringify({
      query: "query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){contributionCalendar{weeks{contributionDays{date contributionCount}}}commitContributionsByRepository(maxRepositories:100){contributions(first:100){nodes{occurredAt commitCount}}}}}}",
      variables: { login: username, from: `${year}-01-01T00:00:00Z`, to: year === currentYear ? new Date().toISOString() : `${year}-12-31T23:59:59Z` },
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
    .map((day) => ({ date: day.date, count: Number(day.contributionCount) || 0, commits: commitsByDate.get(day.date) || 0 }));
}

function kolkataDate(value) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const date = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${date.year}-${date.month}-${date.day}`;
}

module.exports = { getGithubActivity, scanRepository, SCAN_LIMITS };
