const test = require("node:test");
const assert = require("node:assert/strict");
const { buildCareerDNA, buildCareerDNAComparison, extractPracticeProfiles } = require("../services/careerDNAService");
const { getCodeforcesStats } = require("../services/codeforcesService");

const mockAlumni = {
  name: "Adarsh Bhatnagar",
  college: "National Institute of Technology",
  branch: "Computer Science and Engineering",
  batch: 2024,
  company: "Oracle",
  role: "Software Developer",
  package: 18,
  dsaSolved: 320,
  skills: ["Java", "Spring Boot", "MySQL", "DSA"],
  practiceProfiles: [
    { platform: "GITHUB", platformLabel: "GitHub", username: "adarsh-bhatnagar", profileUrl: "https://github.com/adarsh-bhatnagar" },
    { platform: "LEETCODE", platformLabel: "LeetCode", username: "adarsh_b", profileUrl: "https://leetcode.com/u/adarsh_b/" },
  ],
  story: {
    name: "Adarsh Bhatnagar",
    skillsAtSelection: [
      { name: "Java", category: "LANGUAGE", level: "ADVANCED" },
      { name: "Spring Boot", category: "BACKEND", level: "INTERMEDIATE" },
      { name: "MySQL", category: "DATABASE", level: "INTERMEDIATE" },
      { name: "DSA", category: "CORE_CS", level: "ADVANCED" },
    ],
    dsaPreparation: {
      solvedAtSelection: 320,
      currentSolved: 580,
      primaryLanguage: "Java",
      contestRating: 1780,
      strongTopics: ["Dynamic Programming", "Trees", "Graphs"],
      weakTopics: ["Trie"],
    },
    placement: {
      company: "Oracle",
      role: "Software Developer",
      ctc: 18,
      offerType: "FULL_TIME",
    },
    projects: [
      { name: "Distributed Task Scheduler", description: "Task scheduling engine with Redis", techStack: ["Java", "Redis", "Spring Boot"], githubUrl: "https://github.com/adarsh-bhatnagar/task-scheduler", onResume: true, discussedInInterview: true },
    ],
    preparation: {
      months: 8,
      hoursPerDay: 4,
      startedIn: "YEAR_3",
    },
  },
  verification: {
    identity: "VERIFIED",
    placement: "VERIFIED",
    github: "VERIFIED",
    leetcode: "UNVERIFIED",
  },
};

const mockStudent = {
  college: "National Institute of Technology",
  branch: "Computer Science and Engineering",
  skills: [{ name: "Java" }, { name: "DSA" }, { name: "React" }],
  leetcodeStats: { totalSolved: 200 },
  projectDetails: [{ name: "Portfolio", technologies: ["React", "CSS"] }],
};

test("buildCareerDNA extracts complete identity, career, and coding profiles", () => {
  const dna = buildCareerDNA(mockAlumni);
  assert.equal(dna.identity.name, "Adarsh Bhatnagar");
  assert.equal(dna.career.company, "Oracle");
  assert.equal(dna.career.role, "Software Developer");
  assert.equal(dna.career.package, 18);
  assert.equal(dna.coding.dsa.solvedAtSelection, 320);
  assert.equal(dna.coding.dsa.currentSolved, 580);
  assert.equal(dna.coding.github.username, "adarsh-bhatnagar");
  assert.equal(dna.projects.length, 1);
  assert.equal(dna.projects[0].onResume, true);
  assert.equal(dna.preparation.months, 8);
});

test("skillsAtSelection strictly preserves skills recorded at selection time", () => {
  const dna = buildCareerDNA(mockAlumni);
  assert.ok(Array.isArray(dna.skillsAtSelection));
  assert.equal(dna.skillsAtSelection.length, 4);
  const names = dna.skillsAtSelection.map((s) => s.canonical);
  assert.ok(names.includes("java"));
  assert.ok(names.includes("dsa"));
  assert.ok(names.includes("mysql"));
  assert.equal(dna.skillsAtSelection[0].verificationType, "SENIOR_CONFIRMED");
});

test("buildCareerDNAComparison evaluates student against senior selection-time baseline", () => {
  const dna = buildCareerDNA(mockAlumni);
  const comparison = buildCareerDNAComparison(mockStudent, dna);
  assert.ok(Number.isFinite(comparison.matchPercentage));
  assert.ok(comparison.matchedSkills.length >= 2); // Java, DSA
  assert.ok(comparison.missingSkills.length >= 1); // Spring Boot, MySQL
  const dsaDim = comparison.dimensions.find((d) => d.key === "dsa");
  assert.equal(dsaDim.student.value, 200);
  assert.equal(dsaDim.alumni.value, 320); // evaluated against selection count (320), NOT currentSolved (580)
  assert.ok(comparison.gaps.some((g) => g.area === "DSA Practice"));
});

test("extractPracticeProfiles merges stored and story profiles without duplicates", () => {
  const profiles = extractPracticeProfiles(mockAlumni);
  assert.ok(profiles.some((p) => p.platform === "GITHUB" && p.username === "adarsh-bhatnagar"));
  assert.ok(profiles.some((p) => p.platform === "LEETCODE" && p.username === "adarsh_b"));
  const githubs = profiles.filter((p) => p.platform === "GITHUB");
  assert.equal(githubs.length, 1);
});

test("codeforcesService rejects invalid usernames", async () => {
  await assert.rejects(() => getCodeforcesStats(""), /Codeforces username is required/);
  await assert.rejects(() => getCodeforcesStats("   "), /Codeforces username is required/);
  await assert.rejects(() => getCodeforcesStats("invalid user with spaces!"), /Enter a valid Codeforces username/);
});
