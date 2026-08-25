const SKILL_ALIASES = new Map([
  ["js", "javascript"], ["javascript", "javascript"],
  ["node", "nodejs"], ["nodejs", "nodejs"], ["node.js", "nodejs"],
  ["reactjs", "react"], ["react.js", "react"], ["react", "react"],
  ["expressjs", "express"], ["express.js", "express"],
  ["mongo", "mongodb"], ["mongo db", "mongodb"],
  ["data structures and algorithms", "dsa"], ["algorithms", "dsa"],
]);

function normalizeSkill(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  return SKILL_ALIASES.get(normalized) || normalized.replace(/[ .]/g, "");
}

function calculateSeniorMatch(student, senior) {
  const studentSkills = new Map((student.skills || []).map((skill) => [normalizeSkill(skill.name || skill), skill.name || skill]));
  const seniorSkills = new Map((senior.skills || []).map((skill) => [normalizeSkill(skill), skill]));
  const matchedSkills = [...seniorSkills].filter(([key]) => studentSkills.has(key)).map(([, label]) => label);
  const missingSkills = [...seniorSkills].filter(([key]) => !studentSkills.has(key)).map(([, label]) => label);
  const criteria = [];

  if (studentSkills.size && seniorSkills.size) criteria.push({ weight: 50, score: (matchedSkills.length / seniorSkills.size) * 100 });
  if (Number.isFinite(student.leetcodeStats?.totalSolved) && Number.isFinite(senior.dsaSolved) && senior.dsaSolved > 0) criteria.push({ weight: 20, score: Math.min(100, (student.leetcodeStats.totalSolved / senior.dsaSolved) * 100) });
  if (Number.isFinite(student.projects) && Number.isFinite(senior.projects) && senior.projects > 0) criteria.push({ weight: 15, score: Math.min(100, (student.projects / senior.projects) * 100) });
  if (Number.isFinite(student.githubStats?.publicRepos) && Number.isFinite(senior.githubPublicRepos) && senior.githubPublicRepos > 0) criteria.push({ weight: 10, score: Math.min(100, (student.githubStats.publicRepos / senior.githubPublicRepos) * 100) });
  if (Number.isFinite(student.cgpa) && Number.isFinite(senior.cgpa) && senior.cgpa > 0) criteria.push({ weight: 5, score: Math.min(100, (student.cgpa / senior.cgpa) * 100) });

  if (!criteria.length) return null;
  const availableWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  const score = Math.round(criteria.reduce((sum, criterion) => sum + criterion.score * criterion.weight, 0) / availableWeight);
  return {
    score,
    matchedSkills,
    missingSkills,
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

function findBestSeniorMatch(student, alumni) {
  return alumni.map((senior) => calculateSeniorMatch(student, senior)).filter(Boolean).sort((a, b) => b.score - a.score)[0] || null;
}

module.exports = { normalizeSkill, calculateSeniorMatch, findBestSeniorMatch };
