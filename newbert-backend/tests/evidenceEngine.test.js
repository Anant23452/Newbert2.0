const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeRepositorySnapshot, buildSkillEvidence } = require("../services/skillEvidenceService");
const { normalizeProjectEvidence, scoreProject } = require("../services/projectEvidenceService");
const { buildLeetcodeTopicEvidence } = require("../services/leetcodeTopicService");
const { normalizeJobRequirements } = require("../services/jobRequirementEvidenceService");
const { compareEvidence, generateEvidenceTasks } = require("../services/evidenceGapService");

test("React dependency alone is detected but never strong evidence", () => {
  const signals = analyzeRepositorySnapshot({ dependencies: { react: "latest" }, files: ["package.json"], content: "" });
  const evidence = buildSkillEvidence({ githubStats: { repositories: [{ name: "demo", detectedSkills: signals.detectedSkills, usedSkills: signals.usedSkills }] } });
  const react = evidence.skills.find((item) => item.normalizedSkill === "react");
  assert.equal(react.level, "detected");
  assert.notEqual(react.level, "strong_evidence");
});

test("legacy count-only projects remain supported and explicitly limited", () => {
  const projects = normalizeProjectEvidence({ projects: 4 });
  assert.equal(projects.count, 4); assert.equal(projects.level, "count_only"); assert.equal(projects.score, null);
});

test("structured projects produce explainable evidence scores", () => {
  const project = scoreProject({ name: "Newbert", repoUrl: "https://example.com/repo", liveUrl: "https://example.com", technologies: ["React", "Express", "MongoDB"], features: ["authentication", "REST API"], evidence: { hasReadme: true, hasFrontend: true, hasBackend: true, hasDatabase: true, hasAuthentication: true, hasApiIntegration: true } });
  assert.ok(project.projectScore >= 75); assert.equal(project.projectLevel, "strong"); assert.ok(project.evidenceCount >= 8);
});

test("overall LeetCode count does not fabricate topic evidence", () => {
  const result = buildLeetcodeTopicEvidence({ totalSolved: 230 });
  assert.equal(result.topicEvidenceAvailable, false); assert.deepEqual(result.topics, {});
});

test("real tagged or tracked problem records produce scoped topic evidence", () => {
  const tagged = buildLeetcodeTopicEvidence({ totalSolved: 230, solvedProblems: [{ id: "200", titleSlug: "number-of-islands", topics: ["Graph", "DFS"] }] });
  assert.equal(tagged.topicEvidenceAvailable, true); assert.equal(tagged.topics.graph.solved, 1); assert.equal(tagged.topics.graph.dataset, "limited_recent_accepted_feed");
  const tracked = buildLeetcodeTopicEvidence({ totalSolved: 10, solvedProblems: [{ id: "322", titleSlug: "coin-change" }] });
  assert.equal(tracked.topics.dynamic_programming.dataset, "tracked_topic_dataset");
});

test("job requirements preserve explicit, inferred, and baseline provenance", () => {
  const requirements = normalizeJobRequirements({ title: "Frontend Engineer", jdAnalysis: { requirements: [{ label: "Next.js", source: "explicit", confidence: "high", importance: "required", evidenceText: "Build Next.js applications" }] } });
  assert.equal(requirements.find((item) => item.skill === "Next.js").source, "explicit");
  assert.equal(requirements.find((item) => item.normalizedSkill === "react").source, "inferred");
  assert.ok(requirements.some((item) => item.source === "role_baseline"));
});

test("task category follows requirement provenance", () => {
  const requirements = [
    { skill: "React", normalizedSkill: "react", source: "explicit", sourceLabel: "JD requirement", confidence: 1, importance: "required" },
    { skill: "REST APIs", normalizedSkill: "restapis", source: "inferred", sourceLabel: "Strongly inferred", confidence: 0.78, importance: "preferred" },
    { skill: "Git", normalizedSkill: "git", source: "role_baseline", sourceLabel: "Role baseline", confidence: 0.55, importance: "baseline" },
  ];
  const tasks = generateEvidenceTasks(compareEvidence(requirements, { skills: [] }));
  assert.equal(tasks.find((item) => item.skill === "React").category, "critical");
  assert.equal(tasks.find((item) => item.skill === "REST APIs").category, "recommended");
  assert.equal(tasks.find((item) => item.skill === "Git").category, "role_baseline");
});

test("stored profile evidence remains usable when marked stale", () => {
  const result = buildSkillEvidence({ skills: ["React"], evidenceCache: { github: { stale: true } } });
  assert.equal(result.skills[0].skill, "React");
});
