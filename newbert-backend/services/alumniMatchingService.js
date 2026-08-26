const SKILL_ALIASES = new Map([
  ["js", "javascript"], ["javascript", "javascript"], ["react.js", "react"], ["reactjs", "react"], ["node", "nodejs"], ["node.js", "nodejs"], ["nodejs", "nodejs"], ["mongo", "mongodb"], ["mongo db", "mongodb"], ["express.js", "express"], ["expressjs", "express"], ["cpp", "c++"], ["data structures and algorithms", "dsa"], ["algorithms", "dsa"],
]);

function normalizeSkill(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  return SKILL_ALIASES.get(normalized) || normalized.replace(/[ .]/g, "");
}

function normalizeSkillList(values) {
  return [...new Set((values || []).map((value) => normalizeSkill(typeof value === "object" ? value.name : value)).filter(Boolean))];
}

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
  return ({ placement: ["placement", "data"], gate: ["gate", "psu"], psu: ["psu", "gate"], core: ["core"], data: ["data", "placement"], internship: ["internship", "placement"] })[goal] || ["placement"];
}

function alumniPath(alumni) { return alumni.path || alumni.outcomeType || "placement"; }
function numeric(value) { const number = Number(value); return Number.isFinite(number) ? number : null; }
function boundedSimilarity(student, senior) {
  const left = numeric(student); const right = numeric(senior);
  if (left == null || right == null || right <= 0) return null;
  return Math.max(0, Math.min(100, Math.round(100 - (Math.abs(left - right) / Math.max(left, right)) * 60)));
}
function exactSimilarity(left, right) { return left && right ? (normalizeSkill(left) === normalizeSkill(right) ? 100 : 0) : null; }
function weighted(criteria) {
  const available = criteria.filter((item) => item.score != null);
  if (!available.length) return { overallScore: null, breakdown: {} };
  return { overallScore: Math.round(available.reduce((sum, item) => sum + item.score * item.weight, 0) / available.reduce((sum, item) => sum + item.weight, 0)), breakdown: Object.fromEntries(available.map((item) => [item.key, item.score])) };
}
function studentSkills(student) { return normalizeSkillList(student.skills); }
function seniorSkills(alumni) { return normalizeSkillList([...(alumni.skills || []), ...(alumni.csFundamentals || []), ...(alumni.core?.subjects || []), ...(alumni.core?.tools || [])]); }
function skillSimilarity(student, alumni) { const mine = studentSkills(student); const theirs = seniorSkills(alumni); return mine.length && theirs.length ? Math.round((theirs.filter((skill) => mine.includes(skill)).length / theirs.length) * 100) : null; }
function studentDsa(student) { return numeric(student.leetcodeStats?.totalSolved); }
function alumniDsa(alumni) { return numeric(alumni.dsa?.solved ?? alumni.dsaSolved); }
function internshipCount(value) { return Array.isArray(value) ? value.length : numeric(value); }

function calculatePlacementSimilarity(student, alumni, target = {}) {
  const role = target.role || student.targetRole;
  const criteria = [
    { key: "skills", weight: 30, score: skillSimilarity(student, alumni) },
    { key: "dsa", weight: 20, score: boundedSimilarity(studentDsa(student), alumniDsa(alumni)) },
    { key: "projects", weight: 15, score: boundedSimilarity(student.projects, alumni.projects) },
    { key: "cgpa", weight: 10, score: boundedSimilarity(student.cgpa, alumni.cgpa) },
    { key: "collegeBranch", weight: 10, score: exactSimilarity(student.branch, alumni.branch) ?? exactSimilarity(student.college, alumni.college) },
    { key: "role", weight: 10, score: exactSimilarity(role, alumni.placement?.role || alumni.role) },
    { key: "internship", weight: 5, score: boundedSimilarity(internshipCount(student.internships), internshipCount(alumni.internships)) },
  ];
  return { ...weighted(criteria), label: "Profile Match" };
}

function calculateGateSimilarity(student, alumni, target = {}, stage = {}) {
  const completed = normalizeSkillList([...(stage.completed || []), ...(stage.inProgress || [])]);
  const seniorSubjects = normalizeSkillList(alumni.gate?.completedSubjects || alumni.skills);
  const subjectScore = completed.length && seniorSubjects.length ? Math.round((seniorSubjects.filter((item) => completed.includes(item)).length / seniorSubjects.length) * 100) : null;
  const targetScore = String(stage.target || []).join(" ").match(/\d+(?:\.\d+)?/)?.[0];
  const criteria = [
    { key: "branch", weight: 20, score: exactSimilarity(student.branch, alumni.branch) },
    { key: "subjects", weight: 20, score: subjectScore },
    { key: "stage", weight: 20, score: completed.length && seniorSubjects.length ? subjectScore : null },
    { key: "target", weight: 15, score: boundedSimilarity(targetScore, alumni.gate?.score) },
    { key: "mocks", weight: 10, score: boundedSimilarity(stage.mockAverage, alumni.gate?.mockAverage) },
    { key: "duration", weight: 10, score: boundedSimilarity(stage.preparationMonths, alumni.preparationMonths ?? alumni.prepMonths) },
    { key: "destination", weight: 5, score: target.type === "government-psu" ? (alumni.gate?.targetType === "PSU" ? 100 : null) : null },
  ];
  return { ...weighted(criteria), label: "Journey Match" };
}

function calculateCoreSimilarity(student, alumni, target = {}) {
  const coreSkills = normalizeSkillList([...(alumni.core?.subjects || []), ...(alumni.core?.tools || []), ...(alumni.core?.practicalSkills || [])]);
  const mine = studentSkills(student);
  const coreScore = mine.length && coreSkills.length ? Math.round((coreSkills.filter((item) => mine.includes(item)).length / coreSkills.length) * 100) : null;
  return { ...weighted([
    { key: "branch", weight: 25, score: exactSimilarity(student.branch, alumni.branch) },
    { key: "subjectsTools", weight: 30, score: coreScore },
    { key: "role", weight: 15, score: exactSimilarity(target.role || student.targetRole, alumni.core?.role || alumni.role) },
    { key: "projects", weight: 10, score: boundedSimilarity(student.projects, alumni.projects) },
    { key: "internship", weight: 10, score: boundedSimilarity(internshipCount(student.internships), internshipCount(alumni.internships)) },
    { key: "cgpa", weight: 10, score: boundedSimilarity(student.cgpa, alumni.cgpa) },
  ]), label: "Preparation Match" };
}

function calculateSimilarity(student, alumni, context = {}) {
  const goal = context.goal || activeGoal(student, context.plan);
  const stage = context.stage || context.plan?.understoodCurrentStage || {};
  if (goal === "gate" || goal === "psu") return calculateGateSimilarity(student, alumni, context.target || {}, stage);
  if (goal === "core") return calculateCoreSimilarity(student, alumni, context.target || {});
  return calculatePlacementSimilarity(student, alumni, context.target || {});
}

function calculateSkillGap(student, alumni, context = {}) {
  const mine = studentSkills(student); const theirs = seniorSkills(alumni); const matchedSkills = (alumni.skills || []).filter((skill) => mine.includes(normalizeSkill(skill)));
  const missingSkills = theirs.filter((skill) => !mine.includes(skill)).map((skill) => ({ skill, importance: (alumni.csFundamentals || []).some((item) => normalizeSkill(item) === skill) ? "Critical" : ["dbms", "os", "sql", "dsa"].includes(skill) ? "Recommended" : "Optional", reason: (alumni.csFundamentals || []).some((item) => normalizeSkill(item) === skill) ? "This was part of the senior's interview foundation." : "This appears in this senior's preparation profile." }));
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
  return alumniList.filter((alumni) => paths.includes(alumniPath(alumni))).map((alumni) => enrich(student, alumni, { ...context, goal })).filter((item) => item.match.overallScore != null).sort((a, b) => b.match.overallScore - a.match.overallScore);
}
function findClosestSeniors(student, alumniList, limit = 3, context = {}) { return findRelevantAlumni(student, alumniList, context).slice(0, limit); }
function numericGap(studentValue, seniorValue) { const left = numeric(studentValue); const right = numeric(seniorValue); return left == null || right == null ? null : Math.max(0, right - left); }
function buildComparison(student, alumni, context = {}) {
  const enriched = enrich(student, alumni, context);
  return { student: { skills: student.skills || [], dsaSolved: studentDsa(student), projects: numeric(student.projects), cgpa: numeric(student.cgpa), githubRepos: numeric(student.githubStats?.publicRepos), internships: internshipCount(student.internships) }, alumni, match: enriched.match, matchedSkills: enriched.matchedSkills, missingSkills: enriched.missingSkills, studentAdvantages: enriched.studentAdvantages, numericGaps: { dsa: numericGap(studentDsa(student), alumniDsa(alumni)), projects: numericGap(student.projects, alumni.projects), internships: numericGap(internshipCount(student.internships), internshipCount(alumni.internships)), githubRepos: numericGap(student.githubStats?.publicRepos, alumni.github?.repositories ?? alumni.githubPublicRepos), cgpa: numericGap(student.cgpa, alumni.cgpa) } };
}
function buildBenchmark(student, ranked) {
  const cohort = ranked.slice(0, 5).map((item) => item.alumni); if (!cohort.length) return null;
  const average = (values) => { const present = values.map(numeric).filter((value) => value != null); return present.length ? Math.round((present.reduce((sum, value) => sum + value, 0) / present.length) * 10) / 10 : null; };
  const skillCounts = {}; cohort.forEach((alumni) => seniorSkills(alumni).forEach((skill) => { skillCounts[skill] = (skillCounts[skill] || 0) + 1; }));
  const commonSkills = Object.entries(skillCounts).sort(([, a], [, b]) => b - a).slice(0, 6).map(([skill, count]) => ({ skill, percent: Math.round((count / cohort.length) * 100) }));
  const dsa = average(cohort.map(alumniDsa)); const projects = average(cohort.map((alumni) => alumni.projects)); const internshipRate = Math.round((cohort.filter((alumni) => internshipCount(alumni.internships) > 0).length / cohort.length) * 100);
  const insights = []; if (dsa != null && studentDsa(student) != null && dsa > studentDsa(student)) insights.push(`+${Math.round(dsa - studentDsa(student))} average DSA problems among your closest seniors`); commonSkills.slice(0, 3).filter((item) => !studentSkills(student).includes(item.skill)).forEach((item) => insights.push(`${item.skill} appears in ${item.percent}% of the closest profiles`)); if (internshipRate && !internshipCount(student.internships)) insights.push(`${internshipRate}% of the closest seniors had at least one internship`);
  return { cohortSize: cohort.length, averages: { dsa, projects, internshipRate }, student: { dsa: studentDsa(student), projects: numeric(student.projects), internships: internshipCount(student.internships) }, commonSkills, insights };
}

module.exports = { activeGoal, alumniPath, buildBenchmark, buildComparison, calculateCoreSimilarity, calculateGateSimilarity, calculatePlacementSimilarity, calculateSimilarity, calculateSkillGap, findClosestSeniors, findRelevantAlumni, normalizeSkill, normalizeSkillList, pathsForGoal };
