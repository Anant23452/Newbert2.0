const test = require("node:test");
const assert = require("node:assert/strict");
const { generateImprovementPlan, progress } = require("../services/improvementPlanService");

const profile = { userId: "507f1f77bcf86cd799439011", targetRole: "Software Engineer", skills: [], projectDetails: [], githubStats: null, leetcodeStats: null };

test("DBMS plan is generated from the requested skill and does not turn alumni context into student proof", () => {
  const plan = generateImprovementPlan({ profile, skill: "DBMS", alumni: [{ skills: ["DBMS"] }, { skills: ["DBMS"] }] });
  assert.equal(plan.skillId, "dbms");
  assert.equal(plan.status, "not_started");
  assert.equal(plan.reason.studentEvidenceStatus, "none");
  assert.deepEqual(plan.reason.alumniMatch, { matched: 2, total: 2 });
  assert.equal(plan.tasks.at(-1).type, "assessment");
});

test("task completion changes progress only and never verifies a skill", () => {
  const plan = generateImprovementPlan({ profile, skill: "OOP", alumni: [] });
  const tasks = plan.tasks.map((task, index) => ({ ...task, completed: index < 2 }));
  assert.equal(progress(tasks), 40);
  assert.notEqual(plan.status, "verified");
});

test("same generic workflow works for React without hardcoding a core CS plan", () => {
  const plan = generateImprovementPlan({ profile, skill: "React", alumni: [] });
  assert.equal(plan.skillId, "react");
  assert.ok(plan.tasks.some((task) => task.type === "build"));
  assert.ok(plan.tasks.some((task) => task.type === "github"));
});

test("only verified student project evidence can mark an improvement plan verified", () => {
  const verifiedProfile = {
    ...profile,
    projectDetails: [{
      id: "project-1",
      name: "React portfolio",
      source: "github",
      detectedTechnologies: [{ name: "React", canonical: "react", level: "VERIFIED_PROJECT_USAGE", reason: "React components found in code" }],
      evidence: { hasRepository: true },
    }],
  };
  const plan = generateImprovementPlan({ profile: verifiedProfile, skill: "React", alumni: [{ skills: ["React"] }] });
  assert.equal(plan.status, "verified");
  assert.equal(plan.reason.studentEvidenceStatus, "verified");
});
