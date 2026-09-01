const test = require("node:test");
const assert = require("node:assert/strict");
const { buildTargetBenchmark } = require("../services/targetBenchmarkService");
const { buildCurrentPosition, buildMilestoneStrategy, buildPreparationGaps } = require("../services/studentIntelligence/preparationIntelligenceService");

function target(extra = {}) { return { role: "Software Engineer", targetType: "role_only", region: "India", ...extra }; }
function requirement(label, category, importance = "required") { return { id: `req-${label}`, label, canonicalSkill: label.toLowerCase(), category, importance, confidence: "high", source: "explicit", evidenceText: `${label} is listed in the role.` }; }

test("verified current JD evidence outranks the fallback role baseline", () => {
  const job = { _id: "job-1", company: "Example", title: "Software Engineer", applyUrl: "https://example.com/jobs/1", jdAnalysis: { requirements: [requirement("DSA", "technical", "critical"), requirement("DBMS", "cs-fundamental"), requirement("REST APIs", "technical")] } };
  const benchmark = buildTargetBenchmark({ target: target({ targetType: "specific_company", company: "Example" }), jobs: [job], alumni: [] });
  assert.equal(benchmark.sourceLayer, "exact_company_role_jobs");
  assert.equal(benchmark.confidence, "medium");
  assert.equal(benchmark.evidenceSummary.officialJobs, 1);
  assert.equal(benchmark.categories.find((item) => item.key === "dsa").source, "official_job");
});

test("missing company evidence is labeled as a role-baseline fallback", () => {
  const benchmark = buildTargetBenchmark({ target: target({ targetType: "specific_company", company: "Unknown Co" }), jobs: [], alumni: [] });
  assert.equal(benchmark.sourceLayer, "role_baseline");
  assert.equal(benchmark.confidence, "low");
  assert.match(benchmark.fallbackMessage, /No current exact-company job description/);
  assert.ok(benchmark.categories.every((item) => item.source === "role_baseline"));
});

test("self-reported critical skill becomes an evidence-rooted target gap", () => {
  const benchmark = buildTargetBenchmark({ target: target(), jobs: [], alumni: [] });
  const profile = { skills: [{ name: "DSA", source: "manual" }], projectDetails: [] };
  const current = buildCurrentPosition(profile, benchmark);
  const gaps = buildPreparationGaps({ benchmark, currentPosition: current, alumni: [] });
  const dsa = gaps.find((item) => item.categoryKey === "dsa");
  assert.equal(dsa.gapType, "target_gap");
  assert.equal(dsa.rootGapType, "evidence_gap");
});

test("project-backed skill is distinguished from a self-report", () => {
  const benchmark = { categories: [{ key: "frontend", label: "Frontend", importance: "high", confidence: "medium", evidence: [] }] };
  const profile = { projectDetails: [{ name: "Portfolio", technologies: ["React"], liveUrl: "https://example.com", evidence: { hasDeployment: true, hasFrontend: true } }] };
  const current = buildCurrentPosition(profile, benchmark);
  assert.equal(current.categories[0].evidenceKind, "inferred");
  assert.notEqual(current.categories[0].evidenceKind, "self_reported");
});

test("optional target differences do not become active milestones", () => {
  const benchmark = { categories: [{ key: "devops", label: "Docker", importance: "low", confidence: "low", evidence: [] }] };
  const current = buildCurrentPosition({}, benchmark);
  const gaps = buildPreparationGaps({ benchmark, currentPosition: current, alumni: [] });
  const strategy = buildMilestoneStrategy({ gaps });
  assert.equal(gaps[0].gapType, "optional");
  assert.equal(strategy.milestones.length, 0);
});

test("milestone refresh preserves completion and archives removed history", () => {
  const benchmark = buildTargetBenchmark({ target: target(), jobs: [], alumni: [] });
  const current = buildCurrentPosition({}, benchmark);
  const gaps = buildPreparationGaps({ benchmark, currentPosition: current, alumni: [] });
  const first = buildMilestoneStrategy({ gaps });
  first.milestones[0].status = "completed";
  first.milestones[0].completedAt = new Date("2026-08-01T00:00:00.000Z");
  const refreshed = buildMilestoneStrategy({ gaps: gaps.slice(1), existingMilestones: first.milestones });
  const history = refreshed.milestones.find((item) => item.id === first.milestones[0].id);
  assert.equal(history.status, "completed");
  assert.equal(history.archived, true);
});
