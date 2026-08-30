const { calculateSimilarity, findClosestSeniors } = require("./alumniMatchingService");
const { normalizeSkill } = require("./skillNormalizationService");

function calculateSeniorMatch(student, senior, target = {}) {
  const goal = target.type === "gate" ? "gate" : target.type === "government-psu" ? "psu" : target.type === "core-placement" ? "core" : target.type === "data-ai" ? "data" : target.type === "internship" ? "internship" : "placement";
  const upgraded = calculateSimilarity(student, senior, { target, goal });
  if (upgraded.overallScore != null) {
    const closest = findClosestSeniors(student, [senior], 1, { target, goal });
    const details = closest[0] || {};
    return { score: upgraded.overallScore, overallScore: upgraded.overallScore, label: upgraded.label, breakdown: upgraded.breakdown, matchedSkills: details.matchedSkills || [], missingSkills: (details.missingSkills || []).map((item) => item.skill), comparison: details ? { studentDsa: student.leetcodeStats?.totalSolved ?? null, seniorDsa: senior.dsa?.solved ?? senior.dsaSolved ?? null, studentProjects: student.projects ?? null, seniorProjects: senior.projects ?? null, studentGithubRepos: student.githubStats?.publicRepos ?? null, seniorGithubRepos: senior.github?.repositories ?? senior.githubPublicRepos ?? null, studentCgpa: student.cgpa ?? null, seniorCgpa: senior.cgpa ?? null } : {}, senior: { id: String(senior._id), name: senior.name, college: senior.college, company: senior.placement?.company || senior.company, role: senior.placement?.role || senior.role, package: senior.placement?.packageLpa ?? senior.package ?? null, avatar: senior.avatarUrl || "" } };
  }
  const studentSkills = new Map((student.skills || []).map((skill) => [normalizeSkill(skill.name || skill), skill.name || skill]));
  const seniorSkills = new Map((senior.skills || []).map((skill) => [normalizeSkill(skill), skill]));
  const matchedSkills = [...seniorSkills].filter(([key]) => studentSkills.has(key)).map(([, label]) => label);
  const missingSkills = [...seniorSkills].filter(([key]) => !studentSkills.has(key)).map(([, label]) => label);
  const criteria = [];

  if (studentSkills.size && seniorSkills.size) criteria.push({ weight: 40, score: (matchedSkills.length / seniorSkills.size) * 100 });
  if (Number.isFinite(student.leetcodeStats?.totalSolved) && Number.isFinite(senior.dsaSolved) && senior.dsaSolved > 0) criteria.push({ weight: 20, score: Math.min(100, (student.leetcodeStats.totalSolved / senior.dsaSolved) * 100) });
  if (Number.isFinite(student.projects) && Number.isFinite(senior.projects) && senior.projects > 0) criteria.push({ weight: 15, score: Math.min(100, (student.projects / senior.projects) * 100) });
  if (Number.isFinite(student.githubStats?.publicRepos) && Number.isFinite(senior.githubPublicRepos) && senior.githubPublicRepos > 0) criteria.push({ weight: 10, score: Math.min(100, (student.githubStats.publicRepos / senior.githubPublicRepos) * 100) });
  if (Number.isFinite(student.cgpa) && Number.isFinite(senior.cgpa) && senior.cgpa > 0) criteria.push({ weight: 5, score: Math.min(100, (student.cgpa / senior.cgpa) * 100) });
  const comparableProfileSignals = criteria.length;
  const targetSignals = [];
  if (target.company?.trim()) targetSignals.push(senior.company?.trim().toLowerCase() === target.company.trim().toLowerCase() ? 100 : 0);
  if (target.role?.trim()) {
    const wanted = normalizeSkill(target.role);
    const actual = normalizeSkill(senior.role);
    targetSignals.push(actual.includes(wanted) || wanted.includes(actual) ? 100 : 0);
  }
  if (targetSignals.length) criteria.push({ weight: 10, score: Math.max(...targetSignals) });

  if (!comparableProfileSignals) return null;
  const availableWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  const score = Math.round(criteria.reduce((sum, criterion) => sum + criterion.score * criterion.weight, 0) / availableWeight);
  return {
    score,
    matchedSkills,
    missingSkills,
    comparison: {
      studentDsa: Number.isFinite(student.leetcodeStats?.totalSolved) ? student.leetcodeStats.totalSolved : null,
      seniorDsa: Number.isFinite(senior.dsaSolved) ? senior.dsaSolved : null,
      studentProjects: Number.isFinite(student.projects) ? student.projects : null,
      seniorProjects: Number.isFinite(senior.projects) ? senior.projects : null,
      studentGithubRepos: Number.isFinite(student.githubStats?.publicRepos) ? student.githubStats.publicRepos : null,
      seniorGithubRepos: Number.isFinite(senior.githubPublicRepos) ? senior.githubPublicRepos : null,
      studentCgpa: Number.isFinite(student.cgpa) ? student.cgpa : null,
      seniorCgpa: Number.isFinite(senior.cgpa) ? senior.cgpa : null,
    },
    senior: {
      id: String(senior._id),
      name: senior.name,
      college: senior.college,
      company: senior.company,
      role: senior.role,
      package: senior.package ?? null,
      avatar: senior.avatarUrl || "",
    },
  };
}

function findBestSeniorMatch(student, alumni, target) {
  return alumni.map((senior) => calculateSeniorMatch(student, senior, target)).filter(Boolean).sort((a, b) => b.score - a.score)[0] || null;
}

module.exports = { normalizeSkill, calculateSeniorMatch, findBestSeniorMatch };
