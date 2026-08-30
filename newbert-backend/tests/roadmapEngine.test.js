const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPlan, cleanTarget } = require("../services/planService");
const { buildPrioritizedGaps } = require("../services/studentIntelligence/roadmapPriorityService");
const { buildRoadmapStructure } = require("../services/studentIntelligence/roadmapBuilderService");
const { nextBestAction } = require("../services/studentIntelligence/nextBestActionService");
const { explainRoadmap } = require("../services/roadmapExplanationService");

function aiGap(item, category = "skills", severity = "high") { return { item, category, severity, evidence: `No ${item} evidence is currently available.` }; }
function jobContext({ importance = "required", status = "missing", skill = "Docker", id = "job-1" } = {}) {
  const requirement = { id: `req-${skill.toLowerCase()}`, label: skill, canonicalSkill: skill.toLowerCase(), category: "technical", importance, evidenceText: `${skill} is ${importance}.` };
  return { job: { _id: id, company: "Example", title: "Engineer", jdAnalysis: { requirements: [requirement] } }, match: { requirementMatches: [{ requirementId: requirement.id, skill, canonicalSkill: requirement.canonicalSkill, importance, status, jdEvidence: requirement.evidenceText }] } };
}
function normalized(projectCount = 0) { return { projects: { count: projectCount } }; }

test("strong profile produces a short roadmap without beginner tasks", () => {
  const gaps = buildPrioritizedGaps({ ai01: { gaps: [] }, jobContexts: [jobContext({ status: "matched", skill: "Python" })] });
  const roadmap = buildRoadmapStructure({ prioritizedGaps: gaps, normalizedProfile: normalized(2) });
  assert.equal(roadmap.tasks.length, 0);
  assert.equal(nextBestAction(roadmap.tasks), null);
});

test("beginner roadmap puts important fundamentals before core skills", () => {
  const gaps = buildPrioritizedGaps({ ai01: { gaps: [aiGap("Statistics", "fundamentals"), aiGap("scikit-learn", "skills")] } });
  assert.equal(gaps[0].item, "Statistics");
  assert.ok(gaps[0].priorityScore > gaps[1].priorityScore);
  const roadmap = buildRoadmapStructure({ prioritizedGaps: gaps, normalizedProfile: normalized() });
  assert.equal(roadmap.phases[0].id, "foundations");
});

test("job-specific required gap receives high priority", () => {
  const [gap] = buildPrioritizedGaps({ ai01: { gaps: [] }, jobContexts: [jobContext({ importance: "required", skill: "Docker" })] });
  assert.equal(gap.priority, "high");
  assert.equal(gap.priorityScore, 6);
  assert.ok(gap.reasonCodes.includes("REQUIRED_TARGET_JOB"));
});

test("preferred-only gap is lower than a required gap", () => {
  const gaps = buildPrioritizedGaps({ ai01: { gaps: [] }, jobContexts: [jobContext({ importance: "required", skill: "Python", id: "a" }), jobContext({ importance: "preferred", skill: "Docker", id: "b" })] });
  assert.ok(gaps.find((gap) => gap.item === "Python").priorityScore > gaps.find((gap) => gap.item === "Docker").priorityScore);
});

test("refresh preserves completed and skipped task states", () => {
  const gaps = buildPrioritizedGaps({ ai01: { gaps: [aiGap("Statistics", "fundamentals"), aiGap("scikit-learn", "skills")] } });
  const first = buildRoadmapStructure({ prioritizedGaps: gaps, normalizedProfile: normalized() });
  first.tasks[0].status = "completed"; first.tasks[0].completed = true; first.tasks[1].status = "skipped";
  const refreshed = buildRoadmapStructure({ prioritizedGaps: gaps, normalizedProfile: normalized(), existingTasks: first.tasks });
  assert.equal(refreshed.tasks.find((task) => task.id === first.tasks[0].id).status, "completed");
  assert.equal(refreshed.tasks.find((task) => task.id === first.tasks[1].id).status, "skipped");
});

test("improved profile removes obsolete unstarted gap without destroying history", () => {
  const gaps = buildPrioritizedGaps({ ai01: { gaps: [aiGap("Statistics", "fundamentals"), aiGap("Docker", "skills")] } });
  const first = buildRoadmapStructure({ prioritizedGaps: gaps, normalizedProfile: normalized() });
  first.tasks.find((task) => task.title.includes("Statistics")).status = "completed";
  const improved = buildRoadmapStructure({ prioritizedGaps: gaps.filter((gap) => gap.item === "Docker"), normalizedProfile: normalized(), existingTasks: first.tasks });
  assert.equal(improved.tasks.some((task) => task.title.includes("Statistics") && task.archived), true);
  assert.equal(improved.tasks.filter((task) => !task.archived).some((task) => task.title.includes("Statistics")), false);
});

test("no target does not silently become a generic software roadmap", () => {
  const target = cleanTarget({}, {});
  assert.equal(target.role, "");
});

test("low data confidence remains visible in generated plan", () => {
  const plan = buildPlan({ userId: "student", college: "REC", branch: "IT", targetRole: "Machine Learning Engineer", skills: [] }, [], { mode: "role", type: "data-ai", role: "Machine Learning Engineer", weeklyHours: 10 });
  assert.equal(plan.dataConfidence.level, "low");
  assert.equal(plan.prioritizedGaps.length, 0);
});

test("Gemini failure returns deterministic roadmap explanation", async () => {
  const plan = { target: { mode: "role", role: "Backend Developer" }, dataConfidence: { level: "medium" }, nextBestAction: { action: "Learn testing", why: ["Core requirement"] }, phases: [{ id: "core-skills", title: "Core Skills" }], readiness: { total: 50 } };
  const explanation = await explainRoadmap(plan, { generate: async () => { throw new Error("offline"); } });
  assert.equal(explanation.source, "deterministic_fallback");
  assert.match(explanation.nextActionExplanation, /Learn testing/);
});

test("same inputs produce the same priority and task ordering", () => {
  const input = { ai01: { gaps: [aiGap("Statistics", "fundamentals"), aiGap("scikit-learn", "skills")] }, jobContexts: [jobContext({ skill: "Docker" })] };
  const left = buildPrioritizedGaps(input); const right = buildPrioritizedGaps(input);
  assert.deepEqual(left.map((gap) => [gap.id, gap.priorityScore]), right.map((gap) => [gap.id, gap.priorityScore]));
  assert.deepEqual(buildRoadmapStructure({ prioritizedGaps: left, normalizedProfile: normalized(1) }).tasks.map((task) => task.id), buildRoadmapStructure({ prioritizedGaps: right, normalizedProfile: normalized(1) }).tasks.map((task) => task.id));
});

test("existing project is upgraded before recommending another basic project", () => {
  const gaps = buildPrioritizedGaps({ ai01: { gaps: [aiGap("Docker", "skills")] } });
  const task = buildRoadmapStructure({ prioritizedGaps: gaps, normalizedProfile: normalized(1) }).tasks[0];
  assert.match(task.title, /existing project/i);
});
