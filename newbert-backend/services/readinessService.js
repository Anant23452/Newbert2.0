const { normalizeSkill } = require("./skillNormalizationService");
const { getTargetRequirements } = require("./targetRequirementsService");
const { getRoleBenchmark } = require("../config/readinessBenchmarks");

const PROFILE_CATEGORY_WEIGHTS = { skills: 35, dsa: 25, projects: 20, fundamentals: 10, activity: 10 };

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

function percentage(current, target) {
  return Math.max(0, Math.min(100, Math.round((current / Math.max(1, target)) * 100)));
}

function unavailableCategory(label, reason) {
  return { label, status: "unavailable", value: null, explanation: reason };
}

function matchedBenchmarkItems(skills, items) {
  const evidence = new Set(skills.map((skill) => skill.normalizedName));
  return items.filter((item) => item.skills.some((skill) => evidence.has(normalizeSkill(skill))));
}

function coverageFromSkills(label, skills, benchmarkItems) {
  if (!skills.length) return unavailableCategory(label, "Add skills or sync a supported public profile before this category can be evaluated.");
  const matched = matchedBenchmarkItems(skills, benchmarkItems);
  return {
    label,
    status: "available",
    value: percentage(matched.length, benchmarkItems.length),
    numerator: matched.length,
    denominator: benchmarkItems.length,
    matched: matched.map((item) => item.label),
    missing: benchmarkItems.filter((item) => !matched.includes(item)).map((item) => item.label),
    explanation: `${matched.length} of ${benchmarkItems.length} Newbert benchmark categories are represented in current profile evidence.`,
  };
}

function calculateDataConfidence(profile, benchmark) {
  const checks = [
    ["targetRole", "Supported target role", Boolean(benchmark)],
    ["academicProfile", "Academic profile", profile.dataSources.academicProfile],
    ["skills", "Skill profile", profile.dataSources.skills],
    ["leetcode", "LeetCode", profile.dataSources.leetcode],
    ["github", "GitHub", profile.dataSources.github],
    ["projects", "Project count", profile.dataSources.projects],
  ];
  const availableSources = checks.filter(([, , available]) => available).map(([id, label]) => ({ id, label }));
  const missingSources = checks.filter(([, , available]) => !available).map(([id, label]) => ({ id, label }));
  const level = availableSources.length === checks.length ? "high" : availableSources.length >= 3 ? "medium" : "low";
  const reasons = [
    `${availableSources.length} of ${checks.length} analysis sources are currently available.`,
    ...(missingSources.length ? [`Missing information: ${missingSources.map((source) => source.label).join(", ")}.`] : ["All current AI-01 source groups are available."]),
  ];
  return { level, availableSources, missingSources, reasons };
}

function gapSeverity(value, benchmarkPriority = "medium") {
  if (benchmarkPriority === "high" && value < 60) return "high";
  if (value < 50) return "high";
  if (value < 80) return "medium";
  return "low";
}

function calculateProfileReadiness(profile) {
  const benchmark = getRoleBenchmark(profile.goals.targetRole);
  const dataConfidence = calculateDataConfidence(profile, benchmark);
  const emptyCoverage = {
    overall: { status: "unavailable", value: null, explanation: benchmark ? "More profile data is required for a reliable readiness analysis." : "Choose a supported target role to receive role-specific readiness analysis." },
    skills: unavailableCategory("Skill Coverage", "A supported target role and skill evidence are required."),
    dsa: unavailableCategory("DSA Coverage", "A supported target role and synced LeetCode profile are required."),
    projects: unavailableCategory("Project Coverage", "A supported target role and recorded project count are required."),
    fundamentals: unavailableCategory("CS Fundamentals Coverage", "A supported target role and skill evidence are required."),
    activity: unavailableCategory("Activity Coverage", "Synced activity evidence is required."),
  };

  if (!benchmark) {
    return {
      targetRole: profile.goals.targetRole ? { id: null, label: profile.goals.targetRole, supported: false } : null,
      dataConfidence,
      coverage: emptyCoverage,
      strengths: [],
      gaps: [],
      priorities: [],
      evidence: { dsaTopicDataAvailable: false },
    };
  }

  const skills = coverageFromSkills("Skill Coverage", profile.development.skills, benchmark.coreSkills);
  const fundamentals = coverageFromSkills("CS Fundamentals Coverage", profile.development.skills, benchmark.fundamentals);
  const dsa = profile.dsa.available ? {
    label: "DSA Coverage",
    status: "available",
    value: percentage(profile.dsa.totalSolved, benchmark.dsa.targetTotalSolved),
    current: profile.dsa.totalSolved,
    target: benchmark.dsa.targetTotalSolved,
    explanation: `${profile.dsa.totalSolved} total solved problems are compared with Newbert's ${benchmark.label} benchmark of ${benchmark.dsa.targetTotalSolved}. Topic-level data is unavailable and is not inferred.`,
  } : unavailableCategory("DSA Coverage", "LeetCode is not connected or has not been synced; DSA is excluded from overall coverage.");
  const projects = profile.projects.available ? {
    label: "Project Coverage",
    status: "available",
    value: percentage(profile.projects.count, benchmark.projects.targetCount),
    current: profile.projects.count,
    target: benchmark.projects.targetCount,
    explanation: `${profile.projects.count} recorded project${profile.projects.count === 1 ? "" : "s"} compared with Newbert's count benchmark of ${benchmark.projects.targetCount}. Project quality and engineering depth are not currently verified.`,
  } : unavailableCategory("Project Coverage", "No project count is recorded; projects are excluded from overall coverage.");
  const activity = profile.activity.available ? {
    label: "Activity Coverage",
    status: "available",
    value: percentage(profile.activity.activeDaysLast30, benchmark.activity.targetActiveDays30),
    current: profile.activity.activeDaysLast30,
    target: benchmark.activity.targetActiveDays30,
    explanation: `${profile.activity.activeDaysLast30} active days in the last 30 days compared with Newbert's consistency reference of ${benchmark.activity.targetActiveDays30}, using Asia/Kolkata dates.`,
  } : unavailableCategory("Activity Coverage", "No reliable synced activity source is available; activity is excluded from overall coverage.");

  const coverage = { overall: emptyCoverage.overall, skills, dsa, projects, fundamentals, activity };
  const availableCategories = Object.entries(coverage).filter(([key, category]) => key !== "overall" && category.status === "available");
  const hasPrimaryEvidence = [skills, dsa, projects].some((category) => category.status === "available");
  if (availableCategories.length >= 2 && hasPrimaryEvidence) {
    const availableWeight = availableCategories.reduce((sum, [key]) => sum + PROFILE_CATEGORY_WEIGHTS[key], 0);
    coverage.overall = {
      status: "available",
      value: Math.round(availableCategories.reduce((sum, [key, category]) => sum + category.value * PROFILE_CATEGORY_WEIGHTS[key], 0) / availableWeight),
      explanation: `Weighted only across ${availableCategories.map(([, category]) => category.label).join(", ")}; unavailable categories are excluded rather than scored as zero.`,
    };
  }

  const gaps = [];
  if (skills.status === "available") {
    for (const item of benchmark.coreSkills.filter((candidate) => skills.missing.includes(candidate.label))) {
      gaps.push({ category: "skills", item: item.label, severity: item.priority, evidence: "No matching evidence currently appears in the saved or synced skill profile.", reason: `${item.label} is a core category in Newbert's curated ${benchmark.label} benchmark.`, recommendedAction: `Add truthful evidence for ${item.label} through profile work or a relevant project; do not mark it complete without evidence.`, deficit: 100 });
    }
  }
  if (fundamentals.status === "available") {
    for (const item of benchmark.fundamentals.filter((candidate) => fundamentals.missing.includes(candidate.label))) {
      gaps.push({ category: "fundamentals", item: item.label, severity: item.priority, evidence: "This fundamental is not represented in the current skill profile.", reason: `${item.label} is part of Newbert's curated CS fundamentals benchmark.`, recommendedAction: `Review ${item.label} and add it to your profile only when you can support that claim.`, deficit: 100 });
    }
  }
  if (dsa.status === "available" && dsa.value < 80) gaps.push({ category: "dsa", item: "DSA practice coverage", severity: gapSeverity(dsa.value, "high"), evidence: `Synced LeetCode total: ${dsa.current}; topic data unavailable.`, reason: `The current total covers ${dsa.value}% of Newbert's ${benchmark.label} DSA count benchmark.`, recommendedAction: "Continue a balanced DSA practice plan. Newbert cannot name weak topics until reliable topic evidence exists.", deficit: 100 - dsa.value });
  if (projects.status === "available" && projects.value < 100) gaps.push({ category: "projects", item: "Recorded project evidence", severity: gapSeverity(projects.value, "high"), evidence: `${projects.current} project${projects.current === 1 ? " is" : "s are"} currently recorded; project quality is not verified.`, reason: `Newbert's ${benchmark.label} benchmark uses ${projects.target} recorded projects as a coverage reference.`, recommendedAction: "Complete and document one relevant project with a clear problem, implementation, and result.", deficit: 100 - projects.value });
  if (activity.status === "available" && activity.value < 80) gaps.push({ category: "activity", item: "Recent consistency", severity: gapSeverity(activity.value, "medium"), evidence: `${activity.current} synced active days in the last 30 days.`, reason: `The current activity covers ${activity.value}% of Newbert's 30-day consistency reference.`, recommendedAction: "Choose a realistic coding or project routine and let synced activity provide the evidence.", deficit: 100 - activity.value });

  const uniqueGaps = [...new Map(gaps.map((gap) => [gap.item.toLowerCase(), gap])).values()];
  const severityRank = { high: 3, medium: 2, low: 1 };
  uniqueGaps.sort((left, right) => severityRank[right.severity] - severityRank[left.severity] || right.deficit - left.deficit || left.item.localeCompare(right.item));
  const priorities = uniqueGaps.slice(0, 3).map((gap, index) => ({ rank: index + 1, category: gap.category, item: gap.item, severity: gap.severity, reason: gap.reason, recommendedAction: gap.recommendedAction }));
  const strengths = availableCategories.filter(([, category]) => category.value >= 70).map(([key, category]) => ({ category: key, label: category.label, evidence: category.explanation }));

  return {
    targetRole: { id: benchmark.id, label: benchmark.label, supported: true },
    dataConfidence,
    coverage,
    strengths,
    gaps: uniqueGaps.map(({ deficit, ...gap }) => gap),
    priorities,
    evidence: {
      dsaTopicDataAvailable: false,
      githubEvidenceAvailable: profile.github.available,
      recentActivityTimezone: profile.activity.timezone,
    },
  };
}

module.exports = { PROFILE_CATEGORY_WEIGHTS, calculateDataConfidence, calculateProfileReadiness, calculateReadiness, statusFor };
