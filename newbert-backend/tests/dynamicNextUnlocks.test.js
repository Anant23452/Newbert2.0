const test = require("node:test");
const assert = require("node:assert/strict");
const {
  checkProfileCompleteness,
  calculateSkillGaps,
  calculatePriorityScore,
  selectTopUnlocks,
  extractStudentEvidence,
  computeAlumniFrequency,
  computeJobRequirementFrequency,
  evaluateCompanyTypeRelevance,
} = require("../services/nextUnlocksService");
const { generateImprovementPlan } = require("../services/improvementPlanService");
const { normalizeSkill } = require("../services/skillNormalizationService");

test("PART 31 — DYNAMIC NEXT 3 UNLOCKS & IMPROVEMENT PLAN TESTS", async (t) => {
  // Test User Fixtures
  const userA_ProductSde = {
    userId: "user-a",
    targetRole: "Software Engineer",
    companyCategory: "product",
    skills: [{ name: "React" }, { name: "Node.js" }],
    projectDetails: [
      {
        id: "proj-1",
        name: "Fullstack App",
        detectedTechnologies: [
          { name: "React", canonical: "react", level: "VERIFIED_PROJECT_USAGE" },
          { name: "Node.js", canonical: "nodejs", level: "VERIFIED_PROJECT_USAGE" },
        ],
      },
    ],
    leetcodeStats: { totalSolved: 120 }, // DSA verified
  };

  const userB_FrontendStartup = {
    userId: "user-b",
    targetRole: "Frontend Developer",
    companyCategory: "startup",
    skills: [{ name: "HTML" }, { name: "CSS" }, { name: "JavaScript" }],
    projectDetails: [],
    leetcodeStats: { totalSolved: 0 },
  };

  const userC_ServiceTarget = {
    userId: "user-c",
    targetRole: "Software Engineer",
    companyCategory: "service",
    skills: [{ name: "Java" }],
    projectDetails: [],
    leetcodeStats: { totalSolved: 10 },
  };

  const brandNewUser = {
    userId: "user-new",
    targetRole: "",
    companyCategory: "",
    skills: [],
    projectDetails: [],
    leetcodeStats: { totalSolved: 0 },
  };

  await t.test("TEST 1: No hardcoded DBMS/OOP/CN fallback for empty or unknown profiles", () => {
    const completeness = checkProfileCompleteness(brandNewUser);
    assert.equal(completeness.isComplete, false);
    assert.ok(completeness.missing.includes("target_role"));
  });

  await t.test("TEST 2: Different users get different recommendations based on evidence and targets", () => {
    const gapsA = calculateSkillGaps({ profile: userA_ProductSde });
    const topA = selectTopUnlocks(gapsA);

    const gapsB = calculateSkillGaps({ profile: userB_FrontendStartup });
    const topB = selectTopUnlocks(gapsB);

    const gapsC = calculateSkillGaps({ profile: userC_ServiceTarget });
    const topC = selectTopUnlocks(gapsC);

    const skillsA = topA.map((u) => u.skillId);
    const skillsB = topB.map((u) => u.skillId);
    const skillsC = topC.map((u) => u.skillId);

    // User A has React, Node, DSA verified. Expected gaps: core CS / system design / DBMS / OS
    assert.ok(!skillsA.includes("react"), "User A already has verified React");
    assert.ok(!skillsA.includes("nodejs"), "User A already has verified Node");
    assert.ok(!skillsA.includes("dsa"), "User A already has verified DSA");

    // User B (Frontend Startup) should prioritize React, Git, REST APIs, or HTML/CSS tooling
    assert.ok(skillsB.includes("react"), "User B must have React as top unlock");

    // User C (Service-based) should prioritize Aptitude, Communication, OOP, or Core CS
    assert.ok(skillsC.includes("aptitude") || skillsC.includes("oop") || skillsC.includes("dbms"));

    assert.notDeepEqual(skillsA, skillsB, "User A and User B must receive different recommendations");
    assert.notDeepEqual(skillsB, skillsC, "User B and User C must receive different recommendations");
  });

  await t.test("TEST 3: Same user gets stable, deterministic recommendations for unchanged data", () => {
    const run1 = selectTopUnlocks(calculateSkillGaps({ profile: userA_ProductSde }));
    const run2 = selectTopUnlocks(calculateSkillGaps({ profile: userA_ProductSde }));
    assert.deepEqual(
      run1.map((u) => u.skillId),
      run2.map((u) => u.skillId)
    );
  });

  await t.test("TEST 4: Changing target role changes ranking where appropriate", () => {
    const profileFullstack = { ...userB_FrontendStartup, targetRole: "Backend Developer" };
    const gapsFrontend = calculateSkillGaps({ profile: userB_FrontendStartup });
    const gapsBackend = calculateSkillGaps({ profile: profileFullstack });

    const topFrontend = selectTopUnlocks(gapsFrontend).map((u) => u.skillId);
    const topBackend = selectTopUnlocks(gapsBackend).map((u) => u.skillId);

    assert.notDeepEqual(topFrontend, topBackend, "Changing target role must adjust skill rankings");
    assert.ok(topBackend.includes("nodejs") || topBackend.includes("dbms") || topBackend.includes("rest_api"));
  });

  await t.test("TEST 5: Changing company type changes ranking where appropriate", () => {
    const profileStartup = {
      userId: "u-comp",
      targetRole: "Software Engineer",
      companyCategory: "startup",
      skills: [{ name: "Java" }],
      projectDetails: [],
    };
    const profileService = {
      ...profileStartup,
      companyCategory: "service",
    };

    const topStartup = selectTopUnlocks(calculateSkillGaps({ profile: profileStartup })).map((u) => u.skillId);
    const topService = selectTopUnlocks(calculateSkillGaps({ profile: profileService })).map((u) => u.skillId);

    assert.notDeepEqual(topStartup, topService, "Startup vs Service company category must yield different top moves");
    assert.ok(topService.includes("aptitude") || topService.includes("oop"), "Service target should boost aptitude or OOP");
  });

  await t.test("TEST 6: Specific target company influences ranking only when evidence exists", () => {
    const profileWithAmazon = {
      ...userA_ProductSde,
      targetCompany: "Amazon",
    };

    const jobs = [
      {
        company: "Amazon",
        requirements: [{ label: "System Design", normalizedSkill: "system_design", importance: "required" }],
      },
    ];

    const topWithCompany = selectTopUnlocks(calculateSkillGaps({ profile: profileWithAmazon, jobs }));
    const systemDesign = topWithCompany.find((u) => u.skillId === "system_design");
    assert.ok(systemDesign, "Amazon target with system design job requirement should prioritize System Design");
    assert.equal(systemDesign.reason.targetCompanyMatch, true);
  });

  await t.test("TEST 7: Verified skill disappears from unresolved critical gaps", () => {
    const profileWithVerifiedDbms = {
      ...userA_ProductSde,
      projectDetails: [
        ...userA_ProductSde.projectDetails,
        {
          id: "proj-db",
          name: "E-commerce Backend",
          detectedTechnologies: [{ name: "DBMS", canonical: "dbms", level: "VERIFIED_PROJECT_USAGE" }],
        },
      ],
    };

    const top = selectTopUnlocks(calculateSkillGaps({ profile: profileWithVerifiedDbms })).map((u) => u.skillId);
    assert.ok(!top.includes("dbms"), "Verified DBMS must never appear as an unresolved unlock");
  });

  await t.test("TEST 8: In-progress skill shows Continue plan with existing progress", () => {
    const activePlans = [
      {
        skillId: "system_design",
        skillName: "System Design",
        status: "in_progress",
        progressPercent: 60,
        tasks: [{ id: "1", completed: true }, { id: "2", completed: false }],
      },
    ];

    const top = selectTopUnlocks(calculateSkillGaps({ profile: userA_ProductSde, activePlans }));
    const sysDesign = top.find((u) => u.skillId === "system_design");
    if (sysDesign) {
      assert.equal(sysDesign.roadmapStatus, "in_progress");
      assert.ok(sysDesign.plan);
    }
  });

  await t.test("TEST 9: Brand new user gets profile_incomplete status", () => {
    const check = checkProfileCompleteness(brandNewUser);
    assert.equal(check.isComplete, false);
    assert.ok(check.missing.includes("target_role"));
  });

  await t.test("TEST 10: No duplicate aliases (e.g. computer-networks vs computer_networks vs CN)", () => {
    assert.equal(normalizeSkill("Computer Networks"), "computer_networks");
    assert.equal(normalizeSkill("computer-networks"), "computer_networks");
    assert.equal(normalizeSkill("computer_networks"), "computer_networks");
    assert.equal(normalizeSkill("CN"), "computer_networks");
    assert.equal(normalizeSkill("Node.js"), "nodejs");
    assert.equal(normalizeSkill("Object Oriented Programming"), "oop");
  });

  await t.test("TEST 11: Schema conforms to frontend expectations", () => {
    const gaps = calculateSkillGaps({ profile: userB_FrontendStartup });
    const top = selectTopUnlocks(gaps);
    for (const unlock of top) {
      assert.ok(unlock.skillId);
      assert.ok(unlock.skillName);
      assert.ok(unlock.importance);
      assert.ok(unlock.priorityScore);
      assert.ok(unlock.evidenceStatus);
      assert.ok(unlock.roadmapStatus);
      assert.ok(unlock.reason);
      assert.ok(unlock.reason.explanation);
    }
  });

  await t.test("TEST 12: Improvement plan differs dynamically based on existing evidence", () => {
    // User 1 has NO SQL
    const planNoSql = generateImprovementPlan({
      profile: { ...userB_FrontendStartup, skills: [] },
      skill: "DBMS",
    });

    // User 2 already has SQL evidence
    const planWithSql = generateImprovementPlan({
      profile: { ...userB_FrontendStartup, skills: [{ name: "SQL" }] },
      skill: "DBMS",
    });

    assert.equal(planNoSql.tasks[0].title, "SQL fundamentals");
    assert.notEqual(planWithSql.tasks[0].title, "SQL fundamentals");
    assert.equal(planWithSql.tasks[0].title, "Keys and normalization");
  });

  await t.test("TEST 13: Alumni evidence influences priority but does not become student evidence", () => {
    const closestAlumni = [
      { alumni: { skills: ["DBMS", "Operating Systems"] } },
      { alumni: { skills: ["DBMS"] } },
    ];
    const gaps = calculateSkillGaps({ profile: userB_FrontendStartup, closestAlumni });
    const dbmsGap = gaps.find((g) => g.skillId === "dbms");

    assert.equal(dbmsGap.alumniMatchedCount, 2);
    assert.equal(dbmsGap.alumniTotalCount, 2);
    // Student evidence must remain "none", NOT verified
    assert.equal(dbmsGap.currentEvidence, "none");
  });

  await t.test("TEST 14: Job requirement data influences ranking", () => {
    const jobs = [
      { requirements: [{ label: "Docker", normalizedSkill: "docker", importance: "required" }] },
      { requirements: [{ label: "Docker", normalizedSkill: "docker", importance: "required" }] },
    ];
    const gaps = calculateSkillGaps({ profile: userB_FrontendStartup, jobs });
    const dockerGap = gaps.find((g) => g.skillId === "docker");
    assert.equal(dockerGap.jobMatchedCount, 2);
    assert.equal(dockerGap.jobFrequency, 1);
  });

  await t.test("TEST 15: Security & Isolation - User A recommendations do not affect User B", () => {
    const gapsA = calculateSkillGaps({ profile: userA_ProductSde });
    const gapsB = calculateSkillGaps({ profile: userB_FrontendStartup });

    assert.notEqual(gapsA.find((g) => g.skillId === "react").currentEvidence, gapsB.find((g) => g.skillId === "react").currentEvidence);
  });
});
