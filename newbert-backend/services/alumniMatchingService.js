const { normalizeSkill, normalizeSkillList } = require("./skillNormalizationService");
const { roleKey } = require("../data/roleBaselines");

function activeGoal(profile, plan) {
  const value = String(plan?.target?.type || profile?.targetRole || "software-placement").toLowerCase();
  if (/gate/.test(value)) return "gate";
  if (/government|psu/.test(value)) return "psu";
  if (/core/.test(value)) return "core";
  if (/data|machine learning|\bai\b/.test(value)) return "data";
  if (/intern/.test(value)) return "internship";
  return "placement";
}

function pathsForGoal(goal) {
  return (
    {
      placement: ["placement", "data"],
      gate: ["gate", "psu"],
      psu: ["psu", "gate"],
      core: ["core"],
      data: ["data", "placement"],
      internship: ["internship", "placement"],
    }[goal] || ["placement"]
  );
}

function alumniPath(alumni) {
  return alumni.path || alumni.outcomeType || "placement";
}

function numeric(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function boundedSimilarity(student, senior) {
  const left = numeric(student);
  const right = numeric(senior);
  if (left == null || right == null || right <= 0) return null;
  return Math.max(0, Math.min(100, Math.round(100 - (Math.abs(left - right) / Math.max(left, right)) * 60)));
}

function exactSimilarity(left, right) {
  if (!left || !right) return null;
  const l = normalizeSkill(left);
  const r = normalizeSkill(right);
  if (l === r || l.includes(r) || r.includes(l)) return 100;
  return 0;
}

function roleSimilarity(studentRole, seniorRole) {
  if (!studentRole || !seniorRole) return null;
  const key1 = roleKey(studentRole);
  const key2 = roleKey(seniorRole);
  if (key1 === key2) return 100;
  const l = normalizeSkill(studentRole);
  const r = normalizeSkill(seniorRole);
  if (l === r || l.includes(r) || r.includes(l)) return 90;
  return 40;
}

function weighted(criteria) {
  const available = criteria.filter((item) => item.score != null);
  if (!available.length) return { overallScore: null, breakdown: {} };
  return {
    overallScore: Math.round(
      available.reduce((sum, item) => sum + item.score * item.weight, 0) /
        available.reduce((sum, item) => sum + item.weight, 0)
    ),
    breakdown: Object.fromEntries(available.map((item) => [item.key, item.score])),
  };
}

function studentSkills(student) {
  return normalizeSkillList(student.skills);
}

function seniorSkills(alumni) {
  return normalizeSkillList([
    ...(alumni.skills || []),
    ...(alumni.csFundamentals || []),
    ...(alumni.core?.subjects || []),
    ...(alumni.core?.tools || []),
  ]);
}

function skillSimilarity(student, alumni) {
  const mine = studentSkills(student);
  const theirs = seniorSkills(alumni);
  return mine.length && theirs.length
    ? Math.round((theirs.filter((skill) => mine.includes(skill)).length / theirs.length) * 100)
    : null;
}

function studentDsa(student) {
  return numeric(student.leetcodeStats?.totalSolved);
}

function alumniDsa(alumni) {
  return numeric(alumni.dsa?.solved ?? alumni.dsaSolved ?? alumni.leetcodeStats?.totalSolved);
}

function internshipCount(value) {
  return Array.isArray(value) ? value.length : numeric(value);
}

function inferAlumniCompanyCategory(alumni) {
  const company = String(alumni.placement?.company || alumni.company || "").toLowerCase();
  const role = String(alumni.placement?.role || alumni.role || "").toLowerCase();
  if (alumni.companyCategory) return alumni.companyCategory;
  if (/infosys|tcs|wipro|accenture|cognizant|capgemini|hcl|tech mahindra/.test(company)) return "service";
  if (/startup|labs|technologies|fintech/.test(company) || /backend|fullstack|frontend/.test(role)) return "startup";
  return "product";
}

function calculatePlacementSimilarity(student, alumni, target = {}) {
  const role = target.role || student.targetRole || "Software Developer";
  const seniorRole = alumni.placement?.role || alumni.role;
  const seniorCompany = alumni.placement?.company || alumni.company;
  const targetCompany = target.company?.trim();
  const targetCategory = target.companyCategory || (targetCompany && /infosys|tcs|wipro|accenture/.test(targetCompany.toLowerCase()) ? "service" : "product");
  const seniorCategory = inferAlumniCompanyCategory(alumni);

  let companyScore = null;
  if (targetCompany && seniorCompany) {
    companyScore = exactSimilarity(targetCompany, seniorCompany);
  }

  const categoryScore = targetCategory === seniorCategory ? 100 : 50;

  // Differentiated category weighting based on company type
  let dsaWeight = 20;
  let skillsWeight = 15;
  let projectsWeight = 10;
  let categoryWeight = 25;

  if (targetCategory === "service") {
    skillsWeight = 25; // Aptitude, CS fundamentals, OOP
    dsaWeight = 15;
    projectsWeight = 10;
    categoryWeight = 25;
  } else if (targetCategory === "product") {
    dsaWeight = 30; // Deep DSA problem solving
    projectsWeight = 15;
    skillsWeight = 15;
    categoryWeight = 25;
  } else if (targetCategory === "startup") {
    projectsWeight = 30; // Practical project execution & stack evidence
    skillsWeight = 20;
    dsaWeight = 10;
    categoryWeight = 25;
  }

  const criteria = [
    { key: "category", weight: categoryWeight, score: categoryScore },
    { key: "role", weight: 20, score: roleSimilarity(role, seniorRole) },
    { key: "collegeBranch", weight: 10, score: exactSimilarity(student.branch, alumni.branch) ?? exactSimilarity(student.college, alumni.college) },
    { key: "dsa", weight: dsaWeight, score: boundedSimilarity(studentDsa(student), alumniDsa(alumni)) },
    { key: "skills", weight: skillsWeight, score: skillSimilarity(student, alumni) },
    { key: "projects", weight: projectsWeight, score: boundedSimilarity(student.projects, alumni.projects) },
    { key: "company", weight: companyScore != null ? 25 : 0, score: companyScore },
    { key: "cgpa", weight: 5, score: boundedSimilarity(student.cgpa, alumni.cgpa) },
  ];

  const label = companyScore === 100
    ? `Exact ${seniorCompany} Benchmark`
    : targetCategory
    ? `Similar ${targetCategory.charAt(0).toUpperCase() + targetCategory.slice(1)}-based Benchmark`
    : "Profile Match";

  return { ...weighted(criteria), label };
}

function calculateGateSimilarity(student, alumni, target = {}, stage = {}) {
  const gatePreparation = alumni.gatePreparation || {};
  const gateOutcome = alumni.gateOutcome || alumni.gate || {};
  const completed = normalizeSkillList([...(stage.completed || []), ...(stage.inProgress || [])]);
  const seniorSubjects = normalizeSkillList(
    gatePreparation.subjects?.filter((item) => item.completed !== false).map((item) => item.subject) ||
      alumni.gate?.completedSubjects ||
      alumni.skills
  );
  const subjectScore =
    completed.length && seniorSubjects.length
      ? Math.round((seniorSubjects.filter((item) => completed.includes(item)).length / seniorSubjects.length) * 100)
      : null;
  const targetText = Array.isArray(stage.target) ? stage.target.join(" ") : String(stage.target || "");
  const targetScore = targetText.match(/\d+(?:\.\d+)?/)?.[0];
  const gateTestCount =
    gatePreparation.mockTests?.totalAttempted ??
    (gatePreparation.testSeries?.length
      ? gatePreparation.testSeries.reduce((sum, item) => sum + (Number(item.testCountAttempted) || 0), 0)
      : alumni.gate?.mockAverage);

  const criteria = [
    { key: "branch", weight: 20, score: exactSimilarity(student.branch, alumni.branch) },
    { key: "subjects", weight: 20, score: subjectScore },
    { key: "stage", weight: 20, score: completed.length && seniorSubjects.length ? subjectScore : null },
    { key: "target", weight: 15, score: boundedSimilarity(targetScore, gateOutcome.score) },
    { key: "mocks", weight: 10, score: boundedSimilarity(stage.mockAverage ?? stage.testCount, gateTestCount) },
    {
      key: "duration",
      weight: 10,
      score: boundedSimilarity(stage.preparationMonths, gatePreparation.preparationMonths ?? alumni.preparationMonths ?? alumni.prepMonths),
    },
    {
      key: "destination",
      weight: 5,
      score: target.type === "government-psu" ? (gateOutcome.outcomeType === "psu" || alumni.gate?.targetType === "PSU" ? 100 : null) : null,
    },
  ];
  return { ...weighted(criteria), label: "Journey Match" };
}

function calculateCoreSimilarity(student, alumni, target = {}) {
  const coreSkills = normalizeSkillList([
    ...(alumni.core?.subjects || []),
    ...(alumni.core?.tools || []),
    ...(alumni.core?.practicalSkills || []),
  ]);
  const mine = studentSkills(student);
  const coreScore =
    mine.length && coreSkills.length
      ? Math.round((coreSkills.filter((item) => mine.includes(item)).length / coreSkills.length) * 100)
      : null;
  return {
    ...weighted([
      { key: "branch", weight: 25, score: exactSimilarity(student.branch, alumni.branch) },
      { key: "subjectsTools", weight: 30, score: coreScore },
      { key: "role", weight: 15, score: exactSimilarity(target.role || student.targetRole, alumni.core?.role || alumni.role) },
      { key: "projects", weight: 10, score: boundedSimilarity(student.projects, alumni.projects) },
      { key: "internship", weight: 10, score: boundedSimilarity(internshipCount(student.internships), internshipCount(alumni.internships)) },
      { key: "cgpa", weight: 10, score: boundedSimilarity(student.cgpa, alumni.cgpa) },
    ]),
    label: "Preparation Match",
  };
}

function calculateSimilarity(student, alumni, context = {}) {
  const goal = context.goal || activeGoal(student, context.plan);
  const stage = context.stage || context.plan?.understoodCurrentStage || {};
  if (goal === "gate" || goal === "psu") return calculateGateSimilarity(student, alumni, context.target || {}, stage);
  if (goal === "core") return calculateCoreSimilarity(student, alumni, context.target || {});
  return calculatePlacementSimilarity(student, alumni, context.target || {});
}

function calculateSkillGap(student, alumni, context = {}) {
  const mine = studentSkills(student);
  const theirs = seniorSkills(alumni);
  const matchedSkills = (alumni.skills || []).filter((skill) => mine.includes(normalizeSkill(skill)));
  const missingSkills = theirs
    .filter((skill) => !mine.includes(skill))
    .map((skill) => ({
      skill,
      importance: (alumni.csFundamentals || []).some((item) => normalizeSkill(item) === skill)
        ? "Critical"
        : ["dbms", "os", "sql", "dsa", "oops"].includes(skill)
        ? "Recommended"
        : "Optional",
      reason: (alumni.csFundamentals || []).some((item) => normalizeSkill(item) === skill)
        ? "This was part of the senior's interview foundation."
        : "This appears in this senior's preparation profile.",
    }));
  const studentAdvantages = mine.filter((skill) => !theirs.includes(skill));
  return { matchedSkills, missingSkills, studentAdvantages };
}

function enrich(student, alumni, context) {
  const match = calculateSimilarity(student, alumni, context);
  const gaps = calculateSkillGap(student, alumni, context);
  return { alumni, match, ...gaps };
}

function findRelevantAlumni(student, alumniList, context = {}) {
  const goal = context.goal || activeGoal(student, context.plan);
  const paths = pathsForGoal(goal);
  return alumniList
    .filter((alumni) => paths.includes(alumniPath(alumni)))
    .map((alumni) => enrich(student, alumni, { ...context, goal }))
    .filter((item) => item.match.overallScore != null)
    .sort((a, b) => b.match.overallScore - a.match.overallScore);
}

function findClosestSeniors(student, alumniList, limit = 3, context = {}) {
  return findRelevantAlumni(student, alumniList, context).slice(0, limit);
}

function buildBenchmark(student, seniorCohort = []) {
  if (!seniorCohort.length) return null;
  const cohort = seniorCohort.map((item) => item.alumni);
  const cohortSize = cohort.length;

  const skillCounts = new Map();
  for (const senior of cohort) {
    const skills = new Set(seniorSkills(senior));
    for (const skill of skills) {
      skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
    }
  }

  const commonSkills = [...skillCounts.entries()]
    .map(([skill, count]) => ({
      skill,
      count,
      percent: Math.round((count / cohortSize) * 100),
    }))
    .filter((s) => s.percent >= 40)
    .sort((a, b) => b.percent - a.percent);

  return {
    cohortSize,
    commonSkills,
  };
}

function buildComparison(student = {}, alumni = {}, options = {}) {
  const path = options.requestedPath || options.goal || (alumni.careerPaths?.includes("gate") ? "gate" : "placement");
  const dimensions = [];
  const differences = [];

  if (path === "gate") {
    const studentTests = numeric(options.stage?.testCount ?? student.gateStage?.testCount);
    const alumniTests = numeric(alumni.gatePreparation?.mockTests?.totalAttempted ?? alumni.gatePreparation?.testSeriesCount ?? alumni.gateOutcome?.testCount);
    dimensions.push({
      key: "tests",
      label: "Mock Tests",
      student: { value: studentTests, display: studentTests != null ? String(studentTests) : "Unavailable" },
      alumni: { value: alumniTests, display: alumniTests != null ? String(alumniTests) : "Unavailable" },
    });
    if (alumniTests != null) differences.push(`Alumni completed ${alumniTests} tests`);

    const studentPyq = numeric(options.stage?.pyqYears ?? student.gateStage?.pyqYears);
    const alumniPyq = numeric(alumni.gatePreparation?.previousYearQuestions?.yearsCovered ?? alumni.gatePreparation?.pyqYearsCount ?? alumni.gateOutcome?.pyqYears);
    dimensions.push({
      key: "pyq",
      label: "PYQ Years",
      student: { value: studentPyq, display: studentPyq != null ? String(studentPyq) : "Unavailable" },
      alumni: { value: alumniPyq, display: alumniPyq != null ? String(alumniPyq) : "Unavailable" },
    });
  } else {
    const studentDsa = numeric(student.leetcodeStats?.totalSolved ?? student.dsaSolved);
    const alumniDsa = numeric(alumni.placementPreparation?.dsaQuestionsCount ?? alumni.dsaSolved ?? alumni.leetcodeStats?.totalSolved);
    dimensions.push({
      key: "dsa",
      label: "DSA Solved",
      student: { value: studentDsa, display: studentDsa != null ? String(studentDsa) : "Unavailable" },
      alumni: { value: alumniDsa, display: alumniDsa != null ? String(alumniDsa) : "Unavailable" },
    });
    if (alumniDsa != null) differences.push(`Alumni solved ${alumniDsa} DSA problems`);

    const studentProjects = numeric(student.projects?.length ?? student.projects);
    const alumniProjects = numeric(alumni.placementPreparation?.projectsCount ?? alumni.projects?.length ?? alumni.projects);
    dimensions.push({
      key: "projects",
      label: "Projects",
      student: { value: studentProjects, display: studentProjects != null ? String(studentProjects) : "Unavailable" },
      alumni: { value: alumniProjects, display: alumniProjects != null ? String(alumniProjects) : "Unavailable" },
    });
  }

  const hasStudentData = dimensions.some((d) => d.student.value != null);
  const confidence = { level: hasStudentData ? "high" : "low" };
  const similarity = { band: "similar" };

  return {
    path,
    dimensions,
    differences,
    similarity,
    confidence,
  };
}

module.exports = {
  activeGoal,
  alumniPath,
  buildBenchmark,
  buildComparison,
  calculateCoreSimilarity,
  calculateGateSimilarity,
  calculatePlacementSimilarity,
  calculateSimilarity,
  calculateSkillGap,
  findClosestSeniors,
  findRelevantAlumni,
  pathsForGoal,
};
