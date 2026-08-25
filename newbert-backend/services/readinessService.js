const { normalizeSkill } = require("./seniorMatchService");
const { getTargetRequirements } = require("./targetRequirementsService");

function statusFor(score) {
  if (score == null) return "Optional";
  if (score >= 80) return "Ready";
  if (score >= 40) return "Needs Improvement";
  return "Missing";
}

function skillScore(skillMap, requirement) {
  const candidates = requirement.skills || [requirement.label];
  const found = candidates.map((name) => skillMap.get(normalizeSkill(name))).find(Boolean);
  if (!found) return 0;
  return found.score > 0 ? Math.max(60, found.score) : 70;
}

function calculateReadiness(profile, target, seniorMatch, alumni = []) {
  const { type, requirements } = getTargetRequirements(target, profile.branch);
  const skillMap = new Map((profile.skills || []).map((skill) => [normalizeSkill(skill.name || skill), { name: skill.name || skill, score: Number(skill.score) || 0 }]));
  const benchmark = seniorMatch?.comparison || {};
  const relevantAlumni = alumni.filter((senior) => !target.company || senior.company?.toLowerCase() === target.company.toLowerCase());
  const gaps = requirements.map((requirement) => {
    let currentScore = 0;
    let detail = "";
    if (requirement.type === "skill" || requirement.type === "skill-any") currentScore = skillScore(skillMap, requirement);
    if (requirement.type === "dsa") {
      const solved = Number.isFinite(profile.leetcodeStats?.totalSolved) ? profile.leetcodeStats.totalSolved : null;
      const targetSolved = benchmark.seniorDsa || requirement.target;
      currentScore = solved == null ? (skillMap.has("dsa") ? 55 : 0) : Math.min(100, Math.round((solved / Math.max(1, targetSolved)) * 100));
      detail = solved == null ? "LeetCode not connected; using your saved skills only." : `Current ${solved} · benchmark ${targetSolved} · ${Math.max(0, targetSolved - solved)} benchmark gap`;
    }
    if (requirement.type === "projects") {
      const current = Number.isFinite(profile.projects) ? profile.projects : 0;
      const targetProjects = benchmark.seniorProjects || requirement.target || 1;
      currentScore = Math.min(100, Math.round((current / Math.max(1, targetProjects)) * 100));
      detail = `Current ${current} · benchmark ${targetProjects} · ${Math.max(0, targetProjects - current)} more recommended`;
    }
    if (!detail) {
      const count = relevantAlumni.filter((senior) => (senior.skills || []).some((skill) => normalizeSkill(skill) === normalizeSkill(requirement.label))).length;
      detail = count ? `${count} verified ${target.company || target.role || "target"} senior${count === 1 ? " has" : "s have"} this skill.` : `${requirement.label} is part of the selected target requirements.`;
    }
    return { key: requirement.key, label: requirement.label, type: requirement.type, currentScore, targetScore: 100, priority: currentScore >= 80 ? "low" : requirement.priority, status: statusFor(currentScore), detail };
  });

  const missingSeniorSkills = (seniorMatch?.missingSkills || []).filter((name) => !gaps.some((gap) => normalizeSkill(gap.label) === normalizeSkill(name))).slice(0, 4);
  for (const label of missingSeniorSkills) gaps.push({ key: `senior-${normalizeSkill(label)}`, label, type: "skill", currentScore: 0, targetScore: 100, priority: "medium", status: "Missing", detail: `${label} appears in your closest verified senior's profile.` });

  const categories = {};
  const skillGaps = gaps.filter((gap) => gap.type.startsWith("skill"));
  if (skillGaps.length) categories.skills = Math.round(skillGaps.reduce((sum, gap) => sum + gap.currentScore, 0) / skillGaps.length);
  const dsa = gaps.find((gap) => gap.type === "dsa");
  if (dsa) categories.dsa = dsa.currentScore;
  const projects = gaps.find((gap) => gap.type === "projects");
  if (projects) categories.projects = projects.currentScore;
  if (profile.githubStats && Number.isFinite(benchmark.seniorGithubRepos) && benchmark.seniorGithubRepos > 0) {
    const targetRepos = benchmark.seniorGithubRepos;
    categories.github = Math.min(100, Math.round(((profile.githubStats.publicRepos || 0) / targetRepos) * 100));
  }
  if (Number.isFinite(profile.cgpa) && Number.isFinite(benchmark.seniorCgpa)) categories.profile = Math.min(100, Math.round((profile.cgpa / benchmark.seniorCgpa) * 100));
  else if (profile.college && profile.branch) categories.profile = 100;

  const weights = { skills: 40, dsa: 20, projects: 15, github: 10, profile: 5 };
  const available = Object.entries(categories);
  const totalWeight = available.reduce((sum, [key]) => sum + weights[key], 0);
  const total = totalWeight ? Math.round(available.reduce((sum, [key, score]) => sum + score * weights[key], 0) / totalWeight) : 0;
  return { total, categories, gaps, targetType: type };
}

module.exports = { calculateReadiness, statusFor };
