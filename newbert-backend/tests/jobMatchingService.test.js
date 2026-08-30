const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeJobDescription, deterministicJdFallback } = require("../services/jobJdAnalysisService");
const { analyzeJobMatch } = require("../services/jobMatchingService");
const { explainJobMatch } = require("../services/jobMatchExplanationService");

function requirement(label, importance = "required") {
  return { id: `req-${label.toLowerCase().replace(/\W/g, "")}`, canonicalSkill: label.toLowerCase().replace(/[.\s]/g, ""), label, category: "technical", importance, evidenceText: `${label} is ${importance}.`, confidence: "high", scoreEligible: true };
}

function job(requirements, eligibility = {}) {
  return { title: "Backend Developer", company: "Example", description: requirements.map((item) => item.evidenceText).join(" "), jdAnalysis: { role: "Backend Developer", eligibility: { degrees: [], branches: [], graduationYears: [], minimumCgpa: null, locationRestrictions: [], other: [], ...eligibility }, requirements, responsibilities: [], metadata: { extractionMethod: "test", schemaVersion: "2.0" } } };
}

function student(overrides = {}) {
  return { college: "REC", branch: "Information Technology", graduationYear: 2027, cgpa: 8, targetRole: "Backend Developer", projects: 2, skills: [{ name: "Node.js", source: "manual" }, { name: "SQL", source: "manual" }, { name: "Git", source: "manual" }], activityCalendar: [], ...overrides };
}

test("perfect explicit requirement match is deterministic Apply Now coverage", () => {
  const result = analyzeJobMatch(student(), job([requirement("Node.js"), requirement("SQL"), requirement("Git", "preferred")]));
  assert.equal(result.coverage.overall.value, 100);
  assert.equal(result.bucket, "apply_now");
  assert.equal(result.coverage.matchedCount, 3);
});

test("missing one preferred skill can still be Apply Now", () => {
  const result = analyzeJobMatch(student(), job([requirement("Node.js"), requirement("SQL"), requirement("Git"), requirement("Docker", "preferred")]));
  assert.equal(result.coverage.overall.value, 90);
  assert.equal(result.bucket, "apply_now");
  assert.deepEqual(result.gaps.optional, ["Docker"]);
});

test("missing critical skill prevents Apply Now", () => {
  const result = analyzeJobMatch(student(), job([requirement("Docker", "critical"), requirement("Node.js")]));
  assert.equal(result.bucket, "not_ready");
  assert.equal(result.requirementMatches.find((item) => item.skill === "Docker").status, "missing");
});

test("CGPA below an explicit minimum is Not Eligible", () => {
  const result = analyzeJobMatch(student({ cgpa: 6.5 }), job([requirement("Node.js")], { minimumCgpa: 7 }));
  assert.equal(result.eligible, false);
  assert.equal(result.bucket, "not_eligible");
});

test("missing CGPA is unknown rather than failed", () => {
  const result = analyzeJobMatch(student({ cgpa: null }), job([requirement("Node.js")], { minimumCgpa: 7 }));
  assert.equal(result.eligible, null);
  assert.equal(result.eligibility.unknownChecks[0].field, "minimumCgpa");
  assert.equal(result.bucket, "insufficient_data");
});

test("branch aliases do not create a false eligibility failure", () => {
  const result = analyzeJobMatch(student({ branch: "CSE" }), job([requirement("Node.js")], { branches: ["Computer Science and Engineering"] }));
  assert.equal(result.eligible, true);
  assert.equal(result.eligibility.checks[0].status, "passed");
});

test("JD without CGPA does not invent a CGPA rule", () => {
  const analysis = deterministicJdFallback({ title: "Backend Developer", description: "Node.js is required for this role." });
  assert.equal(analysis.eligibility.minimumCgpa, null);
});

test("Docker preferred remains preferred with exact JD provenance", () => {
  const analysis = deterministicJdFallback({ title: "Backend Developer", description: "Node.js is required. Experience with Docker is preferred." });
  const docker = analysis.requirements.find((item) => item.canonicalSkill === "docker");
  assert.equal(docker.importance, "preferred");
  assert.equal(docker.evidenceText, "Experience with Docker is preferred.");
});

test("Gemini unavailable uses deterministic JD extraction", async () => {
  const prior = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const result = await analyzeJobDescription({ title: "Backend Developer", company: "Example", description: "Node.js is required. Docker is preferred." });
    assert.equal(result.source, "deterministic");
    assert.ok(result.analysis.requirements.length >= 2);
  } finally { if (prior) process.env.GEMINI_API_KEY = prior; }
});

test("missing GitHub does not erase available profile skill matches", () => {
  const result = analyzeJobMatch(student({ githubStats: null }), job([requirement("Node.js"), requirement("SQL")]));
  assert.equal(result.coverage.matchedCount, 2);
  assert.equal(result.coverage.missingCount, 0);
});

test("unavailable student skill evidence returns unknown and unavailable coverage", () => {
  const result = analyzeJobMatch(student({ skills: [], githubStats: null }), job([requirement("Node.js")]));
  assert.equal(result.requirementMatches[0].status, "unknown");
  assert.equal(result.coverage.overall.status, "unavailable");
  assert.equal(result.bucket, "insufficient_data");
});

test("same student and job always produce the same deterministic match", () => {
  const inputStudent = student(); const inputJob = job([requirement("Node.js"), requirement("Docker", "preferred")]);
  assert.deepEqual(analyzeJobMatch(inputStudent, inputJob), analyzeJobMatch(inputStudent, inputJob));
});

test("Gemini explanation failure keeps deterministic matching usable", async () => {
  const match = analyzeJobMatch(student(), job([requirement("Node.js"), requirement("SQL")]));
  const explanation = await explainJobMatch(match, { generate: async () => { throw new Error("offline"); } });
  assert.equal(explanation.available, false);
  assert.equal(explanation.source, "deterministic_fallback");
  assert.match(explanation.summary, /requirement coverage/i);
});
