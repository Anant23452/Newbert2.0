const test = require("node:test");
const assert = require("node:assert/strict");

const {
  analyzeRepositorySnapshot,
  buildSkillEvidence,
  levelFor,
} = require("../services/skillEvidenceService");
const {
  scoreProject,
  normalizeProjectEvidence,
  normalizeProject,
} = require("../services/projectEvidenceService");
const {
  calculateCourseFit,
  buildPersonalizedRecommendations,
  extractStudentGaps,
} = require("../services/courseRecommendationService");
const { demoCourseFixtures } = require("../data/demoCourseFixtures");

// ─────────────────────────────────────────────────────────────────────────────
// 1. GITHUB PROJECT INTELLIGENCE TESTS
// ─────────────────────────────────────────────────────────────────────────────

test("GitHub project evidence: JS/Express repository with code patterns produces strong verified usage", () => {
  const project = scoreProject({
    name: "expense-tracker-api",
    technologies: ["Node.js", "Express", "MongoDB", "JWT"],
    detectedTechnologies: [
      { name: "Node.js", canonical: "nodejs", level: "VERIFIED_PROJECT_USAGE", reason: "Express dependencies + require('express') verified" },
      { name: "Express", canonical: "express", level: "VERIFIED_PROJECT_USAGE", reason: "express.Router() routes verified" },
      { name: "MongoDB", canonical: "mongodb", level: "VERIFIED_PROJECT_USAGE", reason: "Mongoose models & schemas verified" },
      { name: "JWT", canonical: "jwt", level: "VERIFIED_PROJECT_USAGE", reason: "jwt.sign / jwt.verify verified" },
    ],
    evidence: {
      hasRepository: true,
      hasDeployment: true,
      hasBackend: true,
      hasDatabase: true,
      hasAuthentication: true,
      hasApiIntegration: true,
      hasReadme: true,
    },
    features: ["user authentication", "REST endpoints", "MongoDB schemas"],
    source: "github",
  });

  assert.ok(project.projectScore >= 75);
  assert.equal(project.projectLevel, "strong");

  const evidence = buildSkillEvidence({
    projectDetails: [project],
  });

  const express = evidence.skills.find((s) => s.normalizedSkill === "express");
  const mongodb = evidence.skills.find((s) => s.normalizedSkill === "mongodb");
  assert.ok(express);
  assert.ok(mongodb);
  assert.ok(express.score >= 30);
  assert.equal(express.sources[0].type, "verified_project_usage");
});

test("GitHub project evidence: Dependency present in manifest but unused is classified as DETECTED, never strong mastery", () => {
  const project = scoreProject({
    name: "simple-app",
    technologies: ["Redis"],
    detectedTechnologies: [
      { name: "Redis", canonical: "redis", level: "DETECTED", reason: "Redis dependency installed in manifest" },
    ],
    evidence: { hasRepository: true },
    source: "github",
  });

  const evidence = buildSkillEvidence({
    projectDetails: [project],
  });

  const redis = evidence.skills.find((s) => s.normalizedSkill === "redis");
  assert.ok(redis);
  assert.ok(redis.score < 35);
  assert.equal(redis.sources[0].type, "detected_in_project");
});

test("Featured project constraint: Maximum 3 featured projects supported in profile normalization", () => {
  const projects = [
    { name: "P1", isFeatured: true, technologies: ["React"] },
    { name: "P2", isFeatured: true, technologies: ["Node.js"] },
    { name: "P3", isFeatured: true, technologies: ["Express"] },
    { name: "P4", isFeatured: true, technologies: ["PostgreSQL"] },
  ];

  const normalized = normalizeProjectEvidence({ projectDetails: projects });
  assert.equal(normalized.featured.length, 3);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. PERSONALIZED COURSE RECOMMENDATION ENGINE TESTS
// ─────────────────────────────────────────────────────────────────────────────

test("Demo course fixtures: Exactly 10 demo courses with isDemo: true and valid demoKeys", () => {
  assert.equal(demoCourseFixtures.length, 10);
  demoCourseFixtures.forEach((course) => {
    assert.equal(course.isDemo, true);
    assert.ok(course.demoKey);
    assert.ok(course.title);
    assert.ok(course.skillsCovered.length > 0);
  });
});

test("Course fit formula: 45% Gap, 25% Target, 15% Level, 10% Quality, 5% Value produces deterministic score", () => {
  const dbmsCourse = demoCourseFixtures.find((c) => c.demoKey === "dbms-interview-core");
  assert.ok(dbmsCourse);

  const studentProfile = {
    targetRole: "Backend Developer",
    skills: [
      { name: "JavaScript", score: 80 },
      { name: "Node.js", score: 75 },
      { name: "Express", score: 70 },
      { name: "DBMS", score: 10 },
      { name: "SQL", score: 15 },
    ],
  };

  const studentPlan = {
    target: { role: "Backend Developer", type: "placement" },
    gaps: [
      { skill: "DBMS", priority: "critical", priorityScore: 90 },
      { skill: "SQL", priority: "high", priorityScore: 75 },
    ],
  };

  const fit = calculateCourseFit(dbmsCourse, studentProfile, studentPlan, []);
  assert.ok(fit.fitScore >= 80, `Expected fitScore >= 80, got ${fit.fitScore}`);
  assert.ok(fit.coveredGaps.includes("DBMS") || fit.coveredGaps.includes("SQL"));
  assert.ok(fit.reasons.length >= 2);
  assert.equal(fit.fitLabel, "Best Match");
});

test("Personalization test: Same student with different targets gets different course rankings", () => {
  const studentProfile = {
    skills: [
      { name: "JavaScript", score: 80 },
      { name: "HTML", score: 85 },
      { name: "CSS", score: 80 },
      { name: "React", score: 30 },
      { name: "Node.js", score: 30 },
      { name: "DBMS", score: 20 },
    ],
  };

  // Scenario 1: Target is Frontend Developer
  const frontendPlan = {
    target: { role: "Frontend Developer", type: "placement" },
    gaps: [
      { skill: "React", priority: "critical", priorityScore: 85 },
      { skill: "JavaScript", priority: "medium", priorityScore: 40 },
    ],
  };
  const frontendRecs = buildPersonalizedRecommendations(demoCourseFixtures, studentProfile, frontendPlan);
  const topFrontend = frontendRecs.bestMatch.course.title;

  // Scenario 2: Target is Backend Developer
  const backendPlan = {
    target: { role: "Backend Developer", type: "placement" },
    gaps: [
      { skill: "Node.js", priority: "critical", priorityScore: 85 },
      { skill: "DBMS", priority: "high", priorityScore: 75 },
    ],
  };
  const backendRecs = buildPersonalizedRecommendations(demoCourseFixtures, studentProfile, backendPlan);
  const topBackend = backendRecs.bestMatch.course.title;

  assert.notEqual(topFrontend, topBackend, "Different targets must produce different top course recommendations.");
  assert.ok(topFrontend.includes("React") || topFrontend.includes("JavaScript"));
  assert.ok(topBackend.includes("Backend") || topBackend.includes("DBMS") || topBackend.includes("PostgreSQL"));
});

test("Personalization test: Same target with different student gaps gets different recommendations", () => {
  const targetPlan = {
    target: { role: "Backend Developer", type: "placement" },
  };

  // Student A: Strong Node, weak DBMS
  const studentA = {
    targetRole: "Backend Developer",
    skills: [{ name: "Node.js", score: 85 }, { name: "Express", score: 80 }],
  };
  const planA = {
    ...targetPlan,
    gaps: [{ skill: "DBMS", priority: "critical", priorityScore: 90 }, { skill: "SQL", priority: "high", priorityScore: 80 }],
  };
  const recsA = buildPersonalizedRecommendations(demoCourseFixtures, studentA, planA);

  // Student B: Strong DBMS, weak Node
  const studentB = {
    targetRole: "Backend Developer",
    skills: [{ name: "DBMS", score: 85 }, { name: "SQL", score: 80 }],
  };
  const planB = {
    ...targetPlan,
    gaps: [{ skill: "Node.js", priority: "critical", priorityScore: 90 }, { skill: "Express", priority: "high", priorityScore: 80 }],
  };
  const recsB = buildPersonalizedRecommendations(demoCourseFixtures, studentB, planB);

  assert.notEqual(recsA.bestMatch.course.title, recsB.bestMatch.course.title);
  assert.ok(recsA.bestMatch.course.title.includes("DBMS") || recsA.bestMatch.course.title.includes("PostgreSQL"));
  assert.ok(recsB.bestMatch.course.title.includes("Backend") || recsB.bestMatch.course.title.includes("API"));
});

test("Affiliate neutrality: isAffiliate status strictly does NOT alter course fit score", () => {
  const baseCourse = { ...demoCourseFixtures[0], isAffiliate: false };
  const affiliateCourse = { ...demoCourseFixtures[0], isAffiliate: true };

  const student = { targetRole: "Software Engineer", skills: [] };
  const plan = { target: { role: "Software Engineer" }, gaps: [{ skill: "DSA", priority: "high" }] };

  const fitNormal = calculateCourseFit(baseCourse, student, plan, []);
  const fitAffiliate = calculateCourseFit(affiliateCourse, student, plan, []);

  assert.equal(fitNormal.fitScore, fitAffiliate.fitScore, "Affiliate course must receive identical score to non-affiliate.");
});

test("Project Evidence to Gap Resolution Loop: Adding verified React+Node project resolves basic gaps and elevates advanced courses", () => {
  // 1. Initial student with self-reported skills
  const initialProfile = {
    targetRole: "Full Stack Developer",
    skills: [{ name: "HTML", score: 80 }],
    projectDetails: [],
  };

  const initialPlan = {
    target: { role: "Full Stack Developer", type: "placement" },
    gaps: [
      { skill: "React", priority: "critical", priorityScore: 90 },
      { skill: "Node.js", priority: "high", priorityScore: 80 },
      { skill: "PostgreSQL", priority: "medium", priorityScore: 50 },
    ],
  };

  const initialRecs = buildPersonalizedRecommendations(demoCourseFixtures, initialProfile, initialPlan);
  const initialTop = initialRecs.bestMatch.course.title;
  assert.ok(initialTop.includes("React") || initialTop.includes("Full-Stack"));

  // 2. Student connects a repository that proves React, Node.js, Express, MongoDB
  const verifiedProject = scoreProject({
    name: "social-network",
    technologies: ["React", "Node.js", "Express", "MongoDB"],
    detectedTechnologies: [
      { name: "React", canonical: "react", level: "VERIFIED_PROJECT_USAGE" },
      { name: "Node.js", canonical: "nodejs", level: "VERIFIED_PROJECT_USAGE" },
      { name: "Express", canonical: "express", level: "VERIFIED_PROJECT_USAGE" },
      { name: "MongoDB", canonical: "mongodb", level: "VERIFIED_PROJECT_USAGE" },
    ],
    evidence: { hasRepository: true, hasFrontend: true, hasBackend: true, hasDatabase: true, hasDeployment: true },
    source: "github",
  });

  const updatedProfile = {
    ...initialProfile,
    projectDetails: [verifiedProject],
  };

  // Remaining gap shifts to PostgreSQL & System Design
  const updatedPlan = {
    target: { role: "Full Stack Developer", type: "placement" },
    gaps: [
      { skill: "PostgreSQL", priority: "critical", priorityScore: 85 },
      { skill: "System Design", priority: "high", priorityScore: 75 },
    ],
  };

  const updatedRecs = buildPersonalizedRecommendations(demoCourseFixtures, updatedProfile, updatedPlan);
  const updatedTop = updatedRecs.bestMatch.course.title;

  assert.ok(updatedTop.includes("PostgreSQL") || updatedTop.includes("System Design") || updatedTop.includes("DBMS"));
});

test("No Course Required intelligence: High readiness or minor targeted problem gaps suggest practice over courses", () => {
  const student = {
    targetRole: "Software Engineer",
    skills: [{ name: "DSA", score: 85 }],
  };

  const planWithOnlyGraphProblems = {
    target: { role: "Software Engineer", type: "placement" },
    readiness: { total: 88 },
    gaps: [{ skill: "Graph problems", priority: "low", priorityScore: 20 }],
  };

  const result = buildPersonalizedRecommendations(demoCourseFixtures, student, planWithOnlyGraphProblems);
  assert.ok(result.noCourseAdvisory);
  assert.equal(result.noCourseAdvisory.recommended, false);
  assert.ok(result.noCourseAdvisory.message.includes("targeted problems"));
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. EFFECTIVE SKILL INVENTORY & PROVENANCE TESTS
// ─────────────────────────────────────────────────────────────────────────────

const { buildEffectiveSkillInventory } = require("../services/skillEvidenceService");
const { getSkillTargetRelevance, isCareerSkill } = require("../services/skillNormalizationService");

test("Effective Skill Inventory: Manual skill only is classified as SELF_REPORTED and unverified proficiency", () => {
  const profile = {
    skills: [{ name: "Java", score: 50, source: "manual" }],
    projectDetails: [],
  };

  const inventory = buildEffectiveSkillInventory(profile, { targetRole: "Software Engineer" });
  const java = inventory.effectiveSkills.find((s) => s.canonical === "java");

  assert.ok(java);
  assert.equal(java.evidenceStrength, "SELF_REPORTED");
  assert.equal(java.proficiency, "UNVERIFIED");
  assert.equal(java.hasManualClaim, true);
  assert.equal(java.hasProjectEvidence, false);
});

test("Effective Skill Inventory: Single GitHub verified project produces VERIFIED_PROJECT_USAGE", () => {
  const project = scoreProject({
    name: "Newbert2.0",
    technologies: ["React", "Node.js"],
    detectedTechnologies: [
      { name: "React", canonical: "react", level: "VERIFIED_PROJECT_USAGE", reason: "React component usage verified" },
      { name: "Node.js", canonical: "nodejs", level: "VERIFIED_PROJECT_USAGE", reason: "Node server routes verified" },
    ],
    evidence: { hasRepository: true, hasFrontend: true, hasBackend: true },
    source: "github",
  });

  const profile = {
    skills: [],
    projectDetails: [project],
  };

  const inventory = buildEffectiveSkillInventory(profile, { targetRole: "Frontend Developer" });
  const react = inventory.effectiveSkills.find((s) => s.canonical === "react");

  assert.ok(react);
  assert.equal(react.evidenceStrength, "VERIFIED_PROJECT_USAGE");
  assert.equal(react.verifiedProjectCount, 1);
  assert.equal(react.targetRelevance, "HIGH");
  assert.equal(react.sources[0].type, "verified_project_usage");
});

test("Effective Skill Inventory: Same skill across 2 projects strengthens to STRONG_REPEATED_PROJECT_USAGE", () => {
  const proj1 = scoreProject({
    name: "Newbert2.0",
    technologies: ["React", "Node.js", "Mongoose", "Vite"],
    detectedTechnologies: [
      { name: "React", canonical: "react", level: "VERIFIED_PROJECT_USAGE" },
      { name: "Node.js", canonical: "nodejs", level: "VERIFIED_PROJECT_USAGE" },
      { name: "Mongoose", canonical: "mongoose", level: "VERIFIED_PROJECT_USAGE" },
      { name: "Vite", canonical: "vite", level: "VERIFIED_PROJECT_USAGE" },
      { name: "Tailwind CSS", canonical: "tailwind", level: "DETECTED" },
    ],
    evidence: { hasRepository: true, hasFrontend: true, hasBackend: true },
    source: "github",
  });

  const proj2 = scoreProject({
    name: "Devhub",
    technologies: ["React", "TypeScript", "Next.js", "JavaScript"],
    detectedTechnologies: [
      { name: "React", canonical: "react", level: "VERIFIED_PROJECT_USAGE" },
      { name: "TypeScript", canonical: "typescript", level: "VERIFIED_PROJECT_USAGE" },
      { name: "Next.js", canonical: "nextjs", level: "VERIFIED_PROJECT_USAGE" },
      { name: "JavaScript", canonical: "javascript", level: "VERIFIED_PROJECT_USAGE" },
      { name: "Tailwind CSS", canonical: "tailwind", level: "DETECTED" },
    ],
    evidence: { hasRepository: true, hasFrontend: true },
    source: "github",
  });

  const profile = {
    skills: [],
    projectDetails: [proj1, proj2],
  };

  const inventory = buildEffectiveSkillInventory(profile, { targetRole: "Frontend Developer" });
  const react = inventory.effectiveSkills.find((s) => s.canonical === "react");
  const tailwind = inventory.effectiveSkills.find((s) => s.canonical === "tailwind");

  assert.ok(react);
  assert.equal(react.evidenceStrength, "STRONG_REPEATED_PROJECT_USAGE");
  assert.equal(react.verifiedProjectCount, 2);
  assert.equal(react.projectCount, 2);

  // Tailwind was only detected in config
  assert.ok(tailwind);
  assert.equal(tailwind.evidenceStrength, "DETECTED");
});

test("Effective Skill Inventory: Manual claim + GitHub verification merges into single canonical skill with provenance", () => {
  const proj = scoreProject({
    name: "portfolio-app",
    technologies: ["React"],
    detectedTechnologies: [
      { name: "React", canonical: "react", level: "VERIFIED_PROJECT_USAGE" },
    ],
    evidence: { hasRepository: true },
    source: "github",
  });

  const profile = {
    skills: [{ name: "react.js", score: 20, source: "manual" }],
    projectDetails: [proj],
  };

  const inventory = buildEffectiveSkillInventory(profile, { targetRole: "Frontend Developer" });
  const reactMatches = inventory.effectiveSkills.filter((s) => s.canonical === "react");

  // Must not have duplicate "React" and "react.js"
  assert.equal(reactMatches.length, 1);
  assert.equal(reactMatches[0].hasManualClaim, true);
  assert.equal(reactMatches[0].hasProjectEvidence, true);
  assert.equal(reactMatches[0].evidenceStrength, "VERIFIED_PROJECT_USAGE");
});

test("Utility packages are NOT promoted to career skills", () => {
  assert.equal(isCareerSkill("axios"), false);
  assert.equal(isCareerSkill("clsx"), false);
  assert.equal(isCareerSkill("lucide-react"), false);
  assert.equal(isCareerSkill("date-fns"), false);
  assert.equal(isCareerSkill("react-toastify"), false);

  assert.equal(isCareerSkill("React"), true);
  assert.equal(isCareerSkill("Node.js"), true);
  assert.equal(isCareerSkill("TypeScript"), true);
  assert.equal(isCareerSkill("PostgreSQL"), true);
  assert.equal(isCareerSkill("Docker"), true);
});

test("Target relevance differs by target role", () => {
  assert.equal(getSkillTargetRelevance("react", "Frontend Developer"), "HIGH");
  assert.equal(getSkillTargetRelevance("react", "Backend Developer"), "MEDIUM");

  assert.equal(getSkillTargetRelevance("nodejs", "Backend Developer"), "HIGH");
  assert.equal(getSkillTargetRelevance("nodejs", "Frontend Developer"), "MEDIUM");

  assert.equal(getSkillTargetRelevance("python", "Data Scientist"), "HIGH");
});
