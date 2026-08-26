const { normalizeSkill, normalizeSkillList } = require("./alumniMatchingService");

function numeric(value) { const number = Number(value); return Number.isFinite(number) ? number : null; }
function list(value) { return Array.isArray(value) ? value : []; }
function studentSkills(profile) { return normalizeSkillList([...(profile.skills || []), ...(profile.githubStats?.languages || [])]); }
function scoreOverlap(mine, required) { return mine.length && required.length ? Math.round((required.filter((skill) => mine.includes(skill)).length / required.length) * 100) : null; }
function boundedEvidence(actual, expected) { const value = numeric(actual); const target = numeric(expected); return value != null && target != null && target > 0 ? Math.max(0, Math.min(100, Math.round((value / target) * 100))) : null; }
function eligibility(profile, requirements = {}) {
  const failedRequirements = [];
  if (numeric(requirements.minimumCgpa) != null && numeric(profile.cgpa) != null && Number(profile.cgpa) < Number(requirements.minimumCgpa)) failedRequirements.push(`Minimum CGPA is ${requirements.minimumCgpa}`);
  if (list(requirements.allowedBranches).length && profile.branch && !list(requirements.allowedBranches).map(normalizeSkill).includes(normalizeSkill(profile.branch))) failedRequirements.push(`This role is limited to ${requirements.allowedBranches.join(", ")}`);
  if (list(requirements.graduationYears).length && numeric(profile.graduationYear) != null && !list(requirements.graduationYears).map(Number).includes(Number(profile.graduationYear))) failedRequirements.push(`This role is for graduation year ${requirements.graduationYears.join(" or ")}`);
  return { eligible: !failedRequirements.length, failedRequirements };
}
function weighted(criteria) { const usable = criteria.filter((item) => item.score != null); return { overallScore: usable.length ? Math.round(usable.reduce((sum, item) => sum + item.score * item.weight, 0) / usable.reduce((sum, item) => sum + item.weight, 0)) : null, breakdown: Object.fromEntries(usable.map((item) => [item.key, item.score])) }; }
function analyzeJobMatch(profile, job) {
  const requirements = job.requirements || {}; const mine = studentSkills(profile); const required = normalizeSkillList(requirements.requiredSkills || job.skills); const preferred = normalizeSkillList(requirements.preferredSkills); const fundamentals = normalizeSkillList(requirements.csFundamentals);
  const result = weighted([
    { key: "requiredSkills", weight: 40, score: scoreOverlap(mine, required) },
    { key: "preferredSkills", weight: 15, score: scoreOverlap(mine, preferred) },
    { key: "projects", weight: 15, score: numeric(profile.projects) != null ? boundedEvidence(profile.projects, requirements.minimumProjects || 2) : null },
    { key: "dsa", weight: 10, score: /dsa|algorithm|coding|leetcode/i.test(`${job.description} ${(requirements.requiredSkills || []).join(" ")}`) ? boundedEvidence(profile.leetcodeStats?.totalSolved, 150) : null },
    { key: "csFundamentals", weight: 10, score: scoreOverlap(mine, fundamentals) },
    { key: "academics", weight: 10, score: numeric(profile.cgpa) != null && numeric(requirements.minimumCgpa) != null ? (profile.cgpa >= requirements.minimumCgpa ? 100 : Math.max(0, Math.round((profile.cgpa / requirements.minimumCgpa) * 100))) : null },
  ]);
  const check = eligibility(profile, requirements);
  const matched = required.filter((skill) => mine.includes(skill)); const missingRequired = required.filter((skill) => !mine.includes(skill)); const missingPreferred = preferred.filter((skill) => !mine.includes(skill)); const missingFundamentals = fundamentals.filter((skill) => !mine.includes(skill));
  const critical = [...missingRequired, ...check.failedRequirements]; const recommended = missingFundamentals; const optional = missingPreferred;
  const eligibleScore = check.eligible ? result.overallScore : null;
  const bucket = !check.eligible ? "not_ready" : eligibleScore >= 80 && !critical.length ? "apply_today" : eligibleScore >= 55 && critical.length <= 2 ? "within_reach" : "not_ready";
  const daysToReach = bucket === "within_reach" ? (critical.length + recommended.length <= 2 ? 14 : null) : null;
  const advantages = mine.filter((skill) => ![...required, ...preferred, ...fundamentals].includes(skill)).slice(0, 5);
  return { overallScore: result.overallScore, eligible: check.eligible, failedRequirements: check.failedRequirements, bucket, withinReachDays: daysToReach, breakdown: result.breakdown, gaps: { critical, recommended, optional }, matchedRequirements: matched, studentAdvantages: advantages, reason: [`Matches your ${profile.targetRole || "career"} target`.trim(), ...matched.slice(0, 3).map((skill) => `${skill} is required for this role`), ...critical.slice(0, 2).map((skill) => `${skill} is currently missing`)] };
}
module.exports = { analyzeJobMatch, eligibility };
