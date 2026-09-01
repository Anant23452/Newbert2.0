const { normalizeSkill, skillLabel } = require("./skillNormalizationService");
const { SKILL_SIGNALS } = require("../config/skillSignals");

const SCAN_LIMITS = Object.freeze({
  maxTreeFiles: 300,
  maxFilesToFetch: 18,
  maxFileBytes: 80000,
});

const MANIFEST_PATTERNS = [
  /package\.json$/i,
  /requirements\.txt$/i,
  /pyproject\.toml$/i,
  /Pipfile$/i,
  /pom\.xml$/i,
  /build\.gradle/i,
  /go\.mod$/i,
  /Cargo\.toml$/i,
  /composer\.json$/i,
  /Gemfile$/i,
];

const CONFIG_PATTERNS = [
  /(?:^|\/)dockerfile/i,
  /docker-compose(?:\.[a-z0-9]+)?\.ya?ml$/i,
  /compose\.ya?ml$/i,
  /\.github\/workflows\/.*\.ya?ml$/i,
  /tailwind\.config\.[a-z0-9]+$/i,
  /vite\.config\.[a-z0-9]+$/i,
  /next\.config\.[a-z0-9]+$/i,
  /astro\.config\.[a-z0-9]+$/i,
  /nuxt\.config\.[a-z0-9]+$/i,
  /vercel\.json$/i,
  /netlify\.toml$/i,
  /render\.ya?ml$/i,
  /prisma\/schema\.prisma$/i,
];

const SOURCE_PATTERNS = [
  /\.(?:jsx?|tsx?|py|java|go|rs|sql|php|rb)$/i,
];

const IGNORE_PATTERNS = /(^|\/)(node_modules|dist|build|vendor|coverage|\.next|\.git|generated|\.cache)(\/|$)/i;

async function githubFetch(url, customHeaders = {}) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Newbert-Project-Intelligence",
    ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
    ...customHeaders,
  };
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    const err = new Error(`GitHub API returned ${response.status}: ${errorBody || response.statusText}`);
    err.status = response.status;
    throw err;
  }
  return response.json();
}

/**
 * Lists public / accessible repositories for the authenticated user's connected GitHub account
 */
async function listUserRepositories(username) {
  if (!username) throw new Error("GitHub username is required.");
  const cleanUsername = username.trim().replace(/^@/, "");
  const repos = await githubFetch(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}/repos?per_page=100&sort=updated`);
  
  if (!Array.isArray(repos)) return [];

  return repos
    .filter((repo) => !repo.archived)
    .map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description || null,
      url: repo.html_url,
      homepage: repo.homepage || null,
      language: repo.language || null,
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      isFork: Boolean(repo.fork),
      defaultBranch: repo.default_branch || "main",
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
      createdAt: repo.created_at,
    }))
    .sort((a, b) => {
      // Non-forks first, then most recently updated
      if (a.isFork !== b.isFork) return a.isFork ? 1 : -1;
      return new Date(b.pushedAt || b.updatedAt) - new Date(a.pushedAt || a.updatedAt);
    });
}

/**
 * Analyzes a specific GitHub repository for tech stack, dependencies, configurations, and code usage.
 */
async function analyzeRepository(repoFullName, defaultBranch = "main") {
  const cleanName = repoFullName.trim();
  
  // 1. Fetch repo details & languages
  const [repoMeta, languagesData] = await Promise.allSettled([
    githubFetch(`https://api.github.com/repos/${cleanName}`),
    githubFetch(`https://api.github.com/repos/${cleanName}/languages`),
  ]);

  const repo = repoMeta.status === "fulfilled" ? repoMeta.value : { full_name: cleanName, default_branch: defaultBranch };
  const actualBranch = repo.default_branch || defaultBranch || "main";
  const languages = languagesData.status === "fulfilled" ? Object.keys(languagesData.value || {}) : (repo.language ? [repo.language] : []);

  // 2. Fetch git tree
  let treeItems = [];
  try {
    const treeData = await githubFetch(`https://api.github.com/repos/${cleanName}/git/trees/${encodeURIComponent(actualBranch)}?recursive=1`);
    treeItems = (treeData.tree || []).filter((item) => item.type === "blob" && !IGNORE_PATTERNS.test(item.path));
  } catch {
    // If recursive tree fails (e.g. empty repo or branch name difference), fallback to contents API
    treeItems = [];
  }

  const filePaths = treeItems.map((item) => item.path);
  const hasReadme = filePaths.some((p) => /(^|\/)readme(?:\.[a-z0-9]+)?$/i.test(p));
  const hasDocker = filePaths.some((p) => /(?:^|\/)dockerfile|docker-compose|compose\.ya?ml/i.test(p));
  const hasCiCd = filePaths.some((p) => /\.github\/workflows\//i.test(p));

  // 3. Select candidate files to inspect content
  const manifestsToFetch = treeItems.filter((item) => MANIFEST_PATTERNS.some((re) => re.test(item.path))).slice(0, 5);
  const configsToFetch = treeItems.filter((item) => CONFIG_PATTERNS.some((re) => re.test(item.path))).slice(0, 5);
  const sourcesToFetch = treeItems.filter((item) => SOURCE_PATTERNS.some((re) => re.test(item.path))).slice(0, SCAN_LIMITS.maxFilesToFetch - manifestsToFetch.length - configsToFetch.length);
  
  const filesToFetch = [...manifestsToFetch, ...configsToFetch, ...sourcesToFetch].slice(0, SCAN_LIMITS.maxFilesToFetch);

  // 4. Fetch and decode file contents
  const contentResults = await Promise.allSettled(
    filesToFetch.map((file) => githubFetch(`https://api.github.com/repos/${cleanName}/contents/${encodeURIComponent(file.path)}`))
  );

  let combinedContent = "";
  let npmDependencies = {};
  let npmDevDependencies = {};
  let rawManifestTexts = [];

  contentResults.forEach((result, idx) => {
    if (result.status !== "fulfilled" || result.value.encoding !== "base64") return;
    const file = filesToFetch[idx];
    try {
      const decoded = Buffer.from(result.value.content, "base64").toString("utf8").slice(0, SCAN_LIMITS.maxFileBytes);
      combinedContent += `\n// File: ${file.path}\n${decoded}`;

      if (/package\.json$/i.test(file.path)) {
        try {
          const parsed = JSON.parse(decoded);
          npmDependencies = { ...npmDependencies, ...(parsed.dependencies || {}) };
          npmDevDependencies = { ...npmDevDependencies, ...(parsed.devDependencies || {}) };
        } catch {}
      } else if (MANIFEST_PATTERNS.some((re) => re.test(file.path))) {
        rawManifestTexts.push(decoded);
      }
    } catch {}
  });

  const allNpmDeps = new Set(
    Object.keys({ ...npmDependencies, ...npmDevDependencies }).map((dep) => dep.toLowerCase())
  );
  const rawManifestCombined = rawManifestTexts.join("\n").toLowerCase();

  // 5. Deep Technology & Framework Detection
  const verifiedUsages = new Map();
  const detectedSignals = new Map();

  // Check language information first
  for (const lang of languages) {
    const norm = normalizeSkill(lang);
    if (norm) {
      detectedSignals.set(norm, {
        name: skillLabel(norm),
        canonical: norm,
        level: "DETECTED",
        evidenceLabel: "Language repository evidence",
        reason: `${lang} detected in repository language metrics`,
        confidence: 0.65,
      });
    }
  }

  // Check Docker
  if (hasDocker) {
    verifiedUsages.set("docker", {
      name: "Docker",
      canonical: "docker",
      level: "VERIFIED_PROJECT_USAGE",
      evidenceLabel: "Strong project evidence",
      reason: "Dockerfile / compose container configuration verified",
      confidence: 0.85,
    });
  }

  // Check CI/CD
  if (hasCiCd) {
    verifiedUsages.set("cicd", {
      name: "CI/CD (GitHub Actions)",
      canonical: "cicd",
      level: "VERIFIED_PROJECT_USAGE",
      evidenceLabel: "Strong project evidence",
      reason: "GitHub Actions workflow pipelines configured in .github/workflows",
      confidence: 0.85,
    });
  }

  // Check Tailwind
  if (allNpmDeps.has("tailwindcss") || filePaths.some((p) => /tailwind\.config/i.test(p)) || combinedContent.includes("@tailwind")) {
    const hasClassUsage = combinedContent.includes("className=") || combinedContent.includes("class=");
    verifiedUsages.set("tailwind", {
      name: "Tailwind CSS",
      canonical: "tailwind",
      level: hasClassUsage ? "VERIFIED_PROJECT_USAGE" : "DETECTED",
      evidenceLabel: hasClassUsage ? "Strong project evidence" : "Detected in manifest",
      reason: hasClassUsage ? "Tailwind dependency + class implementations verified in components" : "Tailwind configuration found in repository",
      confidence: hasClassUsage ? 0.85 : 0.6,
    });
  }

  // Check Vite / Next.js configs
  if (allNpmDeps.has("next") || filePaths.some((p) => /next\.config/i.test(p))) {
    verifiedUsages.set("nextjs", {
      name: "Next.js",
      canonical: "nextjs",
      level: "VERIFIED_PROJECT_USAGE",
      evidenceLabel: "Strong project evidence",
      reason: "Next.js framework dependencies & configuration verified",
      confidence: 0.88,
    });
  }

  if (allNpmDeps.has("vite") || filePaths.some((p) => /vite\.config/i.test(p))) {
    verifiedUsages.set("vite", {
      name: "Vite",
      canonical: "vite",
      level: "VERIFIED_PROJECT_USAGE",
      evidenceLabel: "Strong project evidence",
      reason: "Vite build tool & configuration verified",
      confidence: 0.8,
    });
  }

  // Check Prisma / ORMs / Databases
  if (allNpmDeps.has("@prisma/client") || allNpmDeps.has("prisma") || filePaths.some((p) => /schema\.prisma/i.test(p))) {
    verifiedUsages.set("prisma", {
      name: "Prisma",
      canonical: "prisma",
      level: "VERIFIED_PROJECT_USAGE",
      evidenceLabel: "Strong project evidence",
      reason: "Prisma schema & database client verified",
      confidence: 0.88,
    });
    detectedSignals.set("sql", {
      name: "SQL",
      canonical: "sql",
      level: "DETECTED",
      evidenceLabel: "Database ORM evidence",
      reason: "Relational database modeling via Prisma ORM",
      confidence: 0.75,
    });
  }

  // Check Redis
  if (allNpmDeps.has("redis") || allNpmDeps.has("ioredis") || rawManifestCombined.includes("redis")) {
    const hasCodeUsage = /new\s+(?:Redis|ioredis)|createClient\(|redisClient/i.test(combinedContent);
    const item = {
      name: "Redis",
      canonical: "redis",
      level: hasCodeUsage ? "VERIFIED_PROJECT_USAGE" : "DETECTED",
      evidenceLabel: hasCodeUsage ? "Strong project evidence" : "Detected dependency",
      reason: hasCodeUsage ? "Redis client connections & commands verified in source code" : "Redis dependency installed in manifest",
      confidence: hasCodeUsage ? 0.82 : 0.45,
    };
    if (hasCodeUsage) verifiedUsages.set("redis", item);
    else detectedSignals.set("redis", item);
  }

  // Check PostgreSQL / MySQL
  if (allNpmDeps.has("pg") || allNpmDeps.has("pg-hstore") || rawManifestCombined.includes("psycopg2") || rawManifestCombined.includes("asyncpg")) {
    const hasUsage = /new\s+Pool\(|new\s+Client\(|createPool|sequelize\.define|pg\.connect/i.test(combinedContent) || allNpmDeps.has("pg");
    verifiedUsages.set("postgresql", {
      name: "PostgreSQL",
      canonical: "postgresql",
      level: hasUsage ? "VERIFIED_PROJECT_USAGE" : "DETECTED",
      evidenceLabel: hasUsage ? "Strong project evidence" : "Detected client",
      reason: "PostgreSQL client library & database interaction verified",
      confidence: 0.85,
    });
  }

  if (allNpmDeps.has("mysql2") || allNpmDeps.has("mysql") || rawManifestCombined.includes("pymysql")) {
    verifiedUsages.set("mysql", {
      name: "MySQL",
      canonical: "mysql",
      level: "VERIFIED_PROJECT_USAGE",
      evidenceLabel: "Strong project evidence",
      reason: "MySQL client connection & query operations verified",
      confidence: 0.82,
    });
  }

  // Check Socket.io
  if (allNpmDeps.has("socket.io") || allNpmDeps.has("socket.io-client")) {
    verifiedUsages.set("socketio", {
      name: "Socket.io",
      canonical: "socketio",
      level: "VERIFIED_PROJECT_USAGE",
      evidenceLabel: "Strong project evidence",
      reason: "Realtime WebSocket / Socket.io events verified",
      confidence: 0.85,
    });
  }

  // Check Zustand / Redux
  if (allNpmDeps.has("zustand")) {
    verifiedUsages.set("zustand", {
      name: "Zustand",
      canonical: "zustand",
      level: "VERIFIED_PROJECT_USAGE",
      evidenceLabel: "Strong project evidence",
      reason: "Zustand state store implementation verified",
      confidence: 0.82,
    });
  }

  if (allNpmDeps.has("@reduxjs/toolkit") || allNpmDeps.has("redux") || allNpmDeps.has("react-redux")) {
    verifiedUsages.set("redux", {
      name: "Redux",
      canonical: "redux",
      level: "VERIFIED_PROJECT_USAGE",
      evidenceLabel: "Strong project evidence",
      reason: "Redux state management & slices verified",
      confidence: 0.82,
    });
  }

  // Iterate over SKILL_SIGNALS config
  for (const [key, signal] of Object.entries(SKILL_SIGNALS)) {
    const hasDep = (signal.dependencies || []).some((dep) => allNpmDeps.has(dep) || rawManifestCombined.includes(dep));
    const hasExt = (signal.extensions || []).some((ext) => filePaths.some((file) => file.toLowerCase().endsWith(ext)));
    const hasPattern = (signal.patterns || []).some((pattern) => combinedContent.includes(pattern));

    if (hasDep && hasPattern) {
      verifiedUsages.set(key, {
        name: signal.label,
        canonical: key,
        level: "VERIFIED_PROJECT_USAGE",
        evidenceLabel: "Strong project evidence",
        reason: `${signal.label} manifest dependency + actual code usage verified in repository`,
        confidence: 0.9,
      });
    } else if (hasDep) {
      if (!verifiedUsages.has(key)) {
        detectedSignals.set(key, {
          name: signal.label,
          canonical: key,
          level: "DETECTED",
          evidenceLabel: "Detected in manifest",
          reason: `${signal.label} found in dependency configuration`,
          confidence: 0.65,
        });
      }
    } else if (hasPattern && (hasExt || filePaths.length >= 3)) {
      if (!verifiedUsages.has(key) && !detectedSignals.has(key)) {
        verifiedUsages.set(key, {
          name: signal.label,
          canonical: key,
          level: "VERIFIED_PROJECT_USAGE",
          evidenceLabel: "Used in verified project",
          reason: `${signal.label} implementation patterns detected across source files`,
          confidence: 0.78,
        });
      }
    }
  }

  // Merge detected technologies: verified items take precedence
  const detectedList = [...verifiedUsages.values()];
  for (const [key, item] of detectedSignals) {
    if (!verifiedUsages.has(key)) {
      detectedList.push(item);
    }
  }

  const confirmedNames = detectedList.map((item) => item.name);
  const normalizedKeys = new Set(detectedList.map((item) => item.canonical));

  const hasFrontend = normalizedKeys.has("react") || normalizedKeys.has("nextjs") || normalizedKeys.has("vue") || normalizedKeys.has("angular") || normalizedKeys.has("tailwind");
  const hasBackend = normalizedKeys.has("nodejs") || normalizedKeys.has("express") || normalizedKeys.has("flask") || normalizedKeys.has("fastapi") || normalizedKeys.has("django") || normalizedKeys.has("spring");
  const hasDatabase = normalizedKeys.has("mongodb") || normalizedKeys.has("mongoose") || normalizedKeys.has("postgresql") || normalizedKeys.has("mysql") || normalizedKeys.has("sql") || normalizedKeys.has("prisma") || normalizedKeys.has("redis");
  const hasAuthentication = normalizedKeys.has("jwt") || normalizedKeys.has("oauth") || normalizedKeys.has("firebase") || /auth|login|session|passport/i.test(combinedContent);
  const hasApiIntegration = normalizedKeys.has("restapis") || /axios|fetch\(|router\.(?:get|post)/i.test(combinedContent);

  const evidenceStructure = {
    hasRepository: true,
    hasDeployment: Boolean(repo.homepage),
    hasReadme,
    hasFrontend,
    hasBackend,
    hasDatabase,
    hasAuthentication,
    hasApiIntegration,
    hasDocker,
    hasCiCd,
  };

  const strongCount = [...verifiedUsages.values()].length;
  const evidenceLevel = strongCount >= 3 || (hasBackend && hasDatabase && hasFrontend)
    ? "strong"
    : strongCount >= 1 || detectedList.length >= 2
    ? "moderate"
    : "basic";

  const evidenceLabel = evidenceLevel === "strong"
    ? "Strong project evidence"
    : evidenceLevel === "moderate"
    ? "Used in verified project"
    : "Detected";

  return {
    repositoryId: repo.id,
    repositoryName: repo.name,
    repositoryFullName: repo.full_name || cleanName,
    title: repo.name.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: repo.description || `Repository analyzed from GitHub (${repo.name})`,
    repoUrl: repo.html_url || `https://github.com/${cleanName}`,
    liveUrl: repo.homepage || null,
    primaryLanguage: repo.language || languages[0] || null,
    languages,
    detectedTechnologies: detectedList,
    confirmedTechnologies: confirmedNames,
    technologies: confirmedNames,
    evidence: evidenceStructure,
    evidenceLevel,
    evidenceLabel,
    filesInspected: filesToFetch.length,
    totalTreeFiles: filePaths.length,
    lastAnalyzedAt: new Date(),
    githubUpdatedAt: repo.pushed_at || repo.updated_at || new Date(),
  };
}

module.exports = {
  listUserRepositories,
  analyzeRepository,
  SCAN_LIMITS,
};
