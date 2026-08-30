const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateProfileReadiness } = require("../services/readinessService");
const { explainReadiness } = require("../services/readinessExplanationService");
const { kolkataDate, normalizeStudentProfile } = require("../services/studentProfileNormalizationService");

function richProfile(overrides = {}) {
  return {
    userId: "507f1f77bcf86cd799439011",
    college: "Rajkiya Engineering College, Ambedkar Nagar",
    collegeId: "rec-ambedkar-nagar",
    branch: "Information Technology",
    graduationYear: 2027,
    cgpa: 8.2,
    targetRole: "Full Stack Developer",
    projects: 2,
    skills: [
      { name: "JavaScript", source: "manual" },
      { name: "React", source: "manual" },
      { name: "Node.js", source: "github", score: 72 },
      { name: "MongoDB", source: "github", score: 64 },
      { name: "REST APIs", source: "manual" },
      { name: "Git", source: "manual" },
      { name: "OOP", source: "manual" },
      { name: "DBMS", source: "manual" },
    ],
    leetcodeStats: { username: "student", totalSolved: 180, easySolved: 75, mediumSolved: 90, hardSolved: 15, acceptedActivityAvailable: true },
    githubStats: { username: "student", publicRepos: 12, languages: ["JavaScript"], contributionActivityAvailable: true },
    activityCalendar: [{ date: kolkataDate(), github: 4, leetcode: 2, leetcodeAcceptedProblems: ["two-sum"] }],
    lastSyncedAt: new Date(),
    ...overrides,
  };
}

function analyze(profile) {
  return calculateProfileReadiness(normalizeStudentProfile(profile));
}

test("rich profile produces coverage with high confidence and no topic inference", () => {
  const result = analyze(richProfile());
  assert.equal(result.coverage.overall.status, "available");
  assert.equal(result.dataConfidence.level, "high");
  assert.equal(result.evidence.dsaTopicDataAvailable, false);
  assert.equal(result.coverage.dsa.current, 180);
  assert.ok(result.priorities.length <= 3);
});

test("missing GitHub reduces confidence without zeroing another category", () => {
  const result = analyze(richProfile({ githubStats: null }));
  assert.equal(result.dataConfidence.level, "medium");
  assert.equal(result.dataConfidence.missingSources.some((source) => source.id === "github"), true);
  assert.equal(result.coverage.overall.status, "available");
});

test("missing LeetCode makes DSA unavailable instead of zero", () => {
  const result = analyze(richProfile({ leetcodeStats: null }));
  assert.equal(result.coverage.dsa.status, "unavailable");
  assert.equal(result.coverage.dsa.value, null);
  assert.equal(result.coverage.overall.status, "available");
});

test("missing projects makes project coverage unavailable instead of zero", () => {
  const result = analyze(richProfile({ projects: null }));
  assert.equal(result.coverage.projects.status, "unavailable");
  assert.equal(result.coverage.projects.value, null);
});

test("missing target role prevents arbitrary role-specific coverage", () => {
  const result = analyze(richProfile({ targetRole: null }));
  assert.equal(result.targetRole, null);
  assert.equal(result.coverage.overall.status, "unavailable");
  assert.equal(result.coverage.overall.value, null);
});

test("unsupported target remains honest and does not run a hidden software benchmark", () => {
  const result = analyze(richProfile({ targetRole: "Data / AI" }));
  assert.equal(result.targetRole.supported, false);
  assert.equal(result.coverage.overall.status, "unavailable");
});

test("Gemini failure returns deterministic explanation without breaking readiness", async () => {
  const analysis = analyze(richProfile());
  const explanation = await explainReadiness(analysis, { generate: async () => { throw new Error("provider unavailable"); } });
  assert.equal(explanation.available, false);
  assert.equal(explanation.source, "deterministic_fallback");
  assert.match(explanation.summary, /readiness coverage/i);
});

test("almost-empty profile returns low confidence and no fake zero", () => {
  const result = analyze({ targetRole: "Software Engineer", skills: [], activityCalendar: [] });
  assert.equal(result.dataConfidence.level, "low");
  assert.equal(result.coverage.overall.status, "unavailable");
  assert.equal(result.coverage.overall.value, null);
});
