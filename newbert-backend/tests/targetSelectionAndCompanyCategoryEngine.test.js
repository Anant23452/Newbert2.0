const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildTargetBenchmark,
  categoryFor,
} = require("../services/targetBenchmarkService");
const {
  getCompanyCategoryBaseline,
  getRoleCategories,
} = require("../data/roleBaselines");
const {
  cleanTarget,
} = require("../services/planService");
const {
  buildCurrentPosition,
  buildPreparationGaps,
  deriveAlreadyCovered,
  deriveNextBestMove,
  buildMilestoneStrategy,
} = require("../services/studentIntelligence/preparationIntelligenceService");
const {
  calculatePlacementSimilarity,
} = require("../services/alumniMatchingService");
const {
  calculateCourseFit,
  buildPersonalizedRecommendations,
} = require("../services/courseRecommendationService");
const { demoRoadmapAlumniFixtures } = require("../data/demoRoadmapAlumniFixtures");
const { demoCourseFixtures } = require("../data/demoCourseFixtures");

// ─────────────────────────────────────────────────────────────────────────────
// 1. TARGET SELECTION & CLEANING TESTS
// ─────────────────────────────────────────────────────────────────────────────

test("Target selection: Primary companyCategory is preserved, and targetCompany is optional and nullable", () => {
  // Case A: Service with no company
  const targetA = cleanTarget({ companyCategory: "service", role: "Software Engineer" });
  assert.equal(targetA.companyCategory, "service");
  assert.equal(targetA.company, null);
  assert.equal(targetA.targetType, "company_category");

  // Case B: Service with TCS
  const targetB = cleanTarget({ companyCategory: "service", company: "TCS", role: "Software Engineer" });
  assert.equal(targetB.companyCategory, "service");
  assert.equal(targetB.company, "TCS");
  assert.equal(targetB.targetType, "specific_company");

  // Case C: Product with no company
  const targetC = cleanTarget({ companyCategory: "product", role: "Software Engineer" });
  assert.equal(targetC.companyCategory, "product");
  assert.equal(targetC.company, null);
  assert.equal(targetC.targetType, "company_category");

  // Case D: Startup with no company
  const targetD = cleanTarget({ companyCategory: "startup", role: "Software Engineer" });
  assert.equal(targetD.companyCategory, "startup");
  assert.equal(targetD.company, null);
  assert.equal(targetD.targetType, "company_category");
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. BENCHMARK HIERARCHY & EXPECTATIONS CHANGE ACROSS CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

test("Target Expectations: Service vs Product vs Startup produce distinct benchmark importance profiles", () => {
  const serviceBenchmark = buildTargetBenchmark({
    target: { role: "Software Engineer", companyCategory: "service", company: null },
  });
  const productBenchmark = buildTargetBenchmark({
    target: { role: "Software Engineer", companyCategory: "product", company: null },
  });
  const startupBenchmark = buildTargetBenchmark({
    target: { role: "Software Engineer", companyCategory: "startup", company: null },
  });

  // Verify Fallback Messages (No fake claims)
  assert.equal(serviceBenchmark.fallbackMessage, "Using Service-based Software Engineering benchmark.");
  assert.equal(productBenchmark.fallbackMessage, "Using Product-based Software Engineering benchmark.");
  assert.equal(startupBenchmark.fallbackMessage, "Using Startup Software Engineering benchmark.");

  // Service: Assessment is High, Coding is High, CS Core is High, System Design is Low
  const serviceAssessment = serviceBenchmark.categories.find((c) => c.key === "assessment");
  const serviceSystemDesign = serviceBenchmark.categories.find((c) => c.key === "system_design");
  assert.equal(serviceAssessment.importance, "high");
  assert.equal(serviceSystemDesign.importance, "low");

  // Product: Coding is Critical, CS Core is High, Assessment is Low
  const productCoding = productBenchmark.categories.find((c) => c.key === "coding");
  const productAssessment = productBenchmark.categories.find((c) => c.key === "assessment");
  assert.equal(productCoding.importance, "critical");
  assert.equal(productAssessment.importance, "low");

  // Startup: Development is Critical, Project Evidence is Critical, Assessment is Low
  const startupDev = startupBenchmark.categories.find((c) => c.key === "development");
  const startupProjects = startupBenchmark.categories.find((c) => c.key === "project_evidence");
  const startupAssessment = startupBenchmark.categories.find((c) => c.key === "assessment");
  assert.equal(startupDev.importance, "critical");
  assert.equal(startupProjects.importance, "critical");
  assert.equal(startupAssessment.importance, "low");
});

test("Exact company modifies category benchmark without overriding baseline when no JD exists", () => {
  const tcsBenchmark = buildTargetBenchmark({
    target: { role: "Software Engineer", companyCategory: "service", company: "TCS" },
  });
  assert.equal(tcsBenchmark.company, "TCS");
  assert.equal(tcsBenchmark.companyCategory, "service");
  assert.equal(tcsBenchmark.fallbackMessage, "Based on Service-based benchmark + available TCS evidence.");
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. STUDENT EVIDENCE & GAP CLASSIFICATION DIFFERENTIATION
// ─────────────────────────────────────────────────────────────────────────────

test("Same student profile produces meaningfully different top gaps across Service, Product, and Startup targets", () => {
  // Fixed student profile: moderate programming & basic projects, no LeetCode, unassessed aptitude
  const studentProfile = {
    targetRole: "Software Engineer",
    skills: [
      { name: "JavaScript", score: 60, source: "manual" },
      { name: "Node.js", score: 55, source: "manual" },
      { name: "MongoDB", score: 50, source: "manual" },
    ],
    projectDetails: [],
  };

  // 1. Service Target
  const serviceBenchmark = buildTargetBenchmark({
    target: { role: "Software Engineer", companyCategory: "service", company: null },
  });
  const servicePosition = buildCurrentPosition(studentProfile, serviceBenchmark);
  const serviceGaps = buildPreparationGaps({ benchmark: serviceBenchmark, currentPosition: servicePosition });
  const topServiceGaps = serviceGaps.slice(0, 3).map((g) => g.categoryKey);

  // 2. Product Target
  const productBenchmark = buildTargetBenchmark({
    target: { role: "Software Engineer", companyCategory: "product", company: null },
  });
  const productPosition = buildCurrentPosition(studentProfile, productBenchmark);
  const productGaps = buildPreparationGaps({ benchmark: productBenchmark, currentPosition: productPosition });
  const topProductGaps = productGaps.slice(0, 3).map((g) => g.categoryKey);

  // 3. Startup Target
  const startupBenchmark = buildTargetBenchmark({
    target: { role: "Software Engineer", companyCategory: "startup", company: null },
  });
  const startupPosition = buildCurrentPosition(studentProfile, startupBenchmark);
  const startupGaps = buildPreparationGaps({ benchmark: startupBenchmark, currentPosition: startupPosition });
  const topStartupGaps = startupGaps.slice(0, 3).map((g) => g.categoryKey);

  // Top priorities must differ:
  // Service emphasizes Assessment & CS Core
  assert.ok(topServiceGaps.includes("assessment") || topServiceGaps.includes("cs_core"));

  // Product emphasizes Coding & Problem Solving (DSA)
  assert.ok(topProductGaps.includes("coding"));

  // Startup emphasizes Development & Project Evidence
  assert.ok(topStartupGaps.includes("development") || topStartupGaps.includes("project_evidence"));
});

test("Student with verified project evidence has Development marked as READY and excluded from active milestones", () => {
  const studentWithVerifiedProjects = {
    targetRole: "Full Stack Developer",
    skills: [
      { name: "React", score: 85 },
      { name: "Node.js", score: 80 },
    ],
    projectDetails: [
      {
        name: "FinTech Platform",
        technologies: ["React", "Node.js", "PostgreSQL"],
        detectedTechnologies: [
          { name: "React", canonical: "react", level: "VERIFIED_PROJECT_USAGE" },
          { name: "Node.js", canonical: "nodejs", level: "VERIFIED_PROJECT_USAGE" },
        ],
        evidence: { hasRepository: true, hasDeployment: true, hasBackend: true },
        source: "github",
      },
    ],
  };

  const startupBenchmark = buildTargetBenchmark({
    target: { role: "Full Stack Developer", companyCategory: "startup", company: null },
  });
  const position = buildCurrentPosition(studentWithVerifiedProjects, startupBenchmark);
  const gaps = buildPreparationGaps({ benchmark: startupBenchmark, currentPosition: position });

  const alreadyCovered = deriveAlreadyCovered(gaps);
  const strategy = buildMilestoneStrategy({ gaps });

  // Development should be recognized as already covered, not an active unstarted gap
  const coveredDev = alreadyCovered.find((c) => c.categoryKey === "development");
  assert.ok(coveredDev, "Development should be recognized as already covered");

  // Milestones should focus on remaining areas, not basic React/Node
  const devMilestone = strategy.milestones.find((m) => m.title.includes("basic React") || m.title.includes("basic Node"));
  assert.equal(devMilestone, undefined, "No beginner dev milestone should be created");
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. SENIOR MATCHING DIFFERENTIATION
// ─────────────────────────────────────────────────────────────────────────────

test("Senior matching ranks appropriate alumni higher for Service vs Product vs Startup targets", () => {
  const student = {
    branch: "Computer Science and Engineering",
    targetRole: "Software Engineer",
    skills: ["Java", "JavaScript", "React", "Node.js", "SQL", "DSA"],
    leetcodeStats: { totalSolved: 200 },
    projects: 2,
  };

  // Target Service: Priya Gupta or Arjun Mishra (Service outcome)
  const serviceTarget = { role: "Software Engineer", companyCategory: "service" };
  const serviceMatches = demoRoadmapAlumniFixtures.map((senior) => ({
    senior,
    match: calculatePlacementSimilarity(student, senior, serviceTarget),
  })).sort((a, b) => b.match.overallScore - a.match.overallScore);

  assert.ok(
    serviceMatches[0].senior.demoKey.includes("service") || serviceMatches[0].senior.demoKey.includes("infosys") || serviceMatches[0].senior.companyCategory === "service",
    "Service target should rank service-oriented senior at top"
  );
  assert.ok(serviceMatches[0].match.label.includes("Service-based Benchmark") || serviceMatches[0].match.label.includes("Benchmark"));

  // Target Product: Kunal Sharma (Product SDE, High DSA, System Design)
  const productTarget = { role: "Software Engineer", companyCategory: "product" };
  const productMatches = demoRoadmapAlumniFixtures.map((senior) => ({
    senior,
    match: calculatePlacementSimilarity(student, senior, productTarget),
  })).sort((a, b) => b.match.overallScore - a.match.overallScore);

  assert.ok(
    productMatches[0].senior.demoKey.includes("product") || productMatches[0].senior.demoKey.includes("kunal") || productMatches[0].senior.companyCategory === "product",
    "Product target should rank Product SDE senior at top"
  );

  // Target Startup: Rahul Singh (Startup Demo Labs, Backend/Docker/Redis) or Sneha Verma
  const startupTarget = { role: "Backend Developer", companyCategory: "startup" };
  const startupMatches = demoRoadmapAlumniFixtures.map((senior) => ({
    senior,
    match: calculatePlacementSimilarity(student, senior, startupTarget),
  })).sort((a, b) => b.match.overallScore - a.match.overallScore);

  assert.ok(
    startupMatches[0].senior.demoKey.includes("backend") || startupMatches[0].senior.demoKey.includes("startup") || startupMatches[0].senior.demoKey.includes("rahul"),
    "Startup target should rank practical startup backend senior at top"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. PERSONALIZED COURSE RECOMMENDATIONS DIFFERENTIATION
// ─────────────────────────────────────────────────────────────────────────────

test("Course recommendation engine boosts category-relevant courses across Service, Product, and Startup targets", () => {
  const student = {
    targetRole: "Software Engineer",
    skills: [{ name: "JavaScript", score: 60 }],
  };

  // Scenario 1: Service target elevates Aptitude & DBMS
  const servicePlan = {
    target: { role: "Software Engineer", companyCategory: "service" },
    gaps: [{ skill: "Aptitude", priority: "high", priorityScore: 80 }, { skill: "DBMS", priority: "high", priorityScore: 75 }],
  };
  const serviceRecs = buildPersonalizedRecommendations(demoCourseFixtures, student, servicePlan);
  const topServiceTitle = serviceRecs.bestMatch.course.title;
  assert.ok(topServiceTitle.includes("Aptitude") || topServiceTitle.includes("DBMS") || topServiceTitle.includes("SQL"));

  // Scenario 2: Product target elevates DSA & Algorithms
  const productPlan = {
    target: { role: "Software Engineer", companyCategory: "product" },
    gaps: [{ skill: "DSA", priority: "critical", priorityScore: 95 }, { skill: "System Design", priority: "high", priorityScore: 80 }],
  };
  const productRecs = buildPersonalizedRecommendations(demoCourseFixtures, student, productPlan);
  const topProductTitle = productRecs.bestMatch.course.title;
  assert.ok(topProductTitle.includes("DSA") || topProductTitle.includes("Data Structures") || topProductTitle.includes("System Design"));

  // Scenario 3: Startup target elevates Fullstack & Backend APIs
  const startupPlan = {
    target: { role: "Software Engineer", companyCategory: "startup" },
    gaps: [{ skill: "Backend", priority: "critical", priorityScore: 90 }, { skill: "Docker", priority: "high", priorityScore: 80 }],
  };
  const startupRecs = buildPersonalizedRecommendations(demoCourseFixtures, student, startupPlan);
  const topStartupTitle = startupRecs.bestMatch.course.title;
  assert.ok(topStartupTitle.includes("Backend") || topStartupTitle.includes("Full-Stack") || topStartupTitle.includes("Docker") || topStartupTitle.includes("PostgreSQL"));
});
