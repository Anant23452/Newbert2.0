const { SKILL_REGISTRY, getAllRegistrySkills, getSkillFromRegistry } = require("../data/skillRegistry");
const { normalizeSkill, skillLabel, getSkillTargetRelevance, getSkillCategory } = require("./skillNormalizationService");
const { buildEffectiveSkillInventory } = require("./skillEvidenceService");
const { buildEvidenceReadiness } = require("./evidenceReadinessService");
const { normalizeCompanyCategory } = require("../data/roleBaselines");
const { normalizeJobRequirements } = require("./jobRequirementEvidenceService");

const VERIFIED_STRENGTHS = new Set(["VERIFIED_PROJECT_USAGE", "STRONG_REPEATED_PROJECT_USAGE", "VERIFIED_ASSESSMENT"]);

function extractStudentEvidence(profile, canonicalSkillId) {
  const inventory = buildEffectiveSkillInventory(profile, { targetRole: profile.targetRole });
  const item = inventory.effectiveSkills.find((s) => s.canonical === canonicalSkillId);

  // Check DSA via LeetCode stats
  if (canonicalSkillId === "dsa") {
    const solved = Number(profile.leetcodeStats?.totalSolved || profile.dsaSolved || 0);
    if (solved >= 100) {
      return { status: "verified", summary: `${solved} LeetCode problems verified solved.` };
    }
    if (solved > 0) {
      return { status: "detected", summary: `${solved} LeetCode problems recorded.` };
    }
  }

  // Check project details
  const projectMentions = (profile.projectDetails || []).filter((proj) => {
    return (proj.detectedTechnologies || []).some((tech) => {
      const c = normalizeSkill(tech.canonical || tech.name);
      return c === canonicalSkillId;
    });
  });

  if (projectMentions.length > 0) {
    const hasVerified = projectMentions.some((p) =>
      (p.detectedTechnologies || []).some((t) =>
        normalizeSkill(t.canonical || t.name) === canonicalSkillId && VERIFIED_STRENGTHS.has(t.level)
      )
    );
    if (hasVerified) {
      return { status: "verified", summary: `Verified usage in ${projectMentions.length} project(s).` };
    }
    return { status: "detected", summary: `Detected in ${projectMentions.length} project(s).` };
  }

  if (item) {
    if (VERIFIED_STRENGTHS.has(item.evidenceStrength)) {
      return { status: "verified", summary: item.summary || "Verified student evidence." };
    }
    return { status: "self_reported", summary: item.summary || "Listed in profile skills." };
  }

  // Check self-reported skills
  const listed = (profile.skills || []).some((s) => {
    const name = typeof s === "object" ? s.name || s.skill : s;
    return normalizeSkill(name) === canonicalSkillId;
  });

  if (listed) {
    return { status: "self_reported", summary: "Listed in profile skills without external verification." };
  }

  return { status: "none", summary: "No verified or self-reported evidence found." };
}

function computeAlumniFrequency(skillId, closestAlumni = []) {
  if (!closestAlumni.length) return { frequency: 0, matched: 0, total: 0 };
  let matched = 0;
  for (const senior of closestAlumni) {
    const alumniObj = senior.alumni || senior;
    const skills = [
      ...(alumniObj.skills || []),
      ...(alumniObj.csFundamentals || []),
      ...(alumniObj.placementPreparation?.csFundamentals?.subjects || []),
    ].map((val) => normalizeSkill(typeof val === "object" ? val.subject || val.name || val.skill : val));

    if (skills.includes(skillId)) {
      matched++;
    }
  }
  return {
    frequency: Number((matched / closestAlumni.length).toFixed(2)),
    matched,
    total: closestAlumni.length,
  };
}

function computeJobRequirementFrequency(skillId, jobs = [], targetCompany = "") {
  if (!jobs.length) return { frequency: 0, matched: 0, total: 0, companyMatch: false };
  let matched = 0;
  let companyMatched = false;

  for (const job of jobs) {
    const reqs = normalizeJobRequirements(job);
    const hasSkill = reqs.some((r) => normalizeSkill(r.normalizedSkill || r.skill || r.label) === skillId);
    if (hasSkill) {
      matched++;
      if (targetCompany && String(job.company || "").toLowerCase().includes(targetCompany.toLowerCase())) {
        companyMatched = true;
      }
    }
  }

  return {
    frequency: Number((matched / jobs.length).toFixed(2)),
    matched,
    total: jobs.length,
    companyMatch: companyMatched,
  };
}

function evaluateCompanyTypeRelevance(skillId, companyCategory) {
  const normCategory = normalizeCompanyCategory(companyCategory) || "product";

  if (normCategory === "startup") {
    if (["react", "nodejs", "rest_api", "git", "docker", "mongodb", "postgresql", "html_css", "javascript", "typescript"].includes(skillId)) {
      return "HIGH";
    }
    if (["dsa", "system_design", "python"].includes(skillId)) return "MEDIUM";
    return "LOW";
  }

  if (normCategory === "service") {
    if (["aptitude", "communication", "oop", "dbms", "computer_networks", "java", "python"].includes(skillId)) {
      return "HIGH";
    }
    if (["dsa", "sql", "operating_systems"].includes(skillId)) return "MEDIUM";
    return "LOW";
  }

  // Product-based
  if (["dsa", "system_design", "operating_systems", "dbms", "computer_networks", "oop"].includes(skillId)) {
    return "HIGH";
  }
  if (["react", "nodejs", "postgresql", "rest_api", "git", "docker"].includes(skillId)) {
    return "MEDIUM";
  }
  return "LOW";
}

function calculateSkillGaps(context) {
  const { profile, roadmap, closestAlumni = [], jobs = [], activePlans = [] } = context;

  const targetRole = profile.targetRole || roadmap?.target?.role || "";
  const companyCategory = profile.companyCategory || profile.targetCompanyType || roadmap?.target?.companyCategory || "product";
  const targetCompany = profile.targetCompany || roadmap?.target?.company || "";

  const planBySkill = new Map();
  for (const plan of activePlans) {
    planBySkill.set(normalizeSkill(plan.skillId || plan.skillName), plan);
  }

  const allSkills = getAllRegistrySkills();
  const gaps = [];

  for (const registrySkill of allSkills) {
    const skillId = registrySkill.id;
    const skillName = registrySkill.name;

    const evidence = extractStudentEvidence(profile, skillId);
    const alumniMatch = computeAlumniFrequency(skillId, closestAlumni);
    const jobMatch = computeJobRequirementFrequency(skillId, jobs, targetCompany);
    const roleRelevance = getSkillTargetRelevance(skillId, targetRole);
    const companyTypeRelevance = evaluateCompanyTypeRelevance(skillId, companyCategory);

    // Target company match from alumni or jobs
    let targetCompanyMatch = jobMatch.companyMatch;
    if (targetCompany && !targetCompanyMatch) {
      targetCompanyMatch = closestAlumni.some((senior) => {
        const a = senior.alumni || senior;
        const comp = String(a.company || a.placement?.company || "").toLowerCase();
        if (comp.includes(targetCompany.toLowerCase())) {
          const skills = (a.skills || []).map(normalizeSkill);
          return skills.includes(skillId);
        }
        return false;
      });
    }

    // Roadmap / Improvement Plan Status
    const existingPlan = planBySkill.get(skillId);
    let roadmapStatus = "not_started";
    if (evidence.status === "verified" || existingPlan?.status === "verified") {
      roadmapStatus = "completed";
    } else if (existingPlan) {
      roadmapStatus = "in_progress";
    }

    gaps.push({
      skillId,
      skillName,
      category: registrySkill.category,
      currentEvidence: evidence.status,
      evidenceSummary: evidence.summary,
      targetRoleRelevance: roleRelevance,
      companyTypeRelevance,
      targetCompanyMatch,
      alumniFrequency: alumniMatch.frequency,
      alumniMatchedCount: alumniMatch.matched,
      alumniTotalCount: alumniMatch.total,
      jobFrequency: jobMatch.frequency,
      jobMatchedCount: jobMatch.matched,
      jobTotalCount: jobMatch.total,
      roadmapStatus,
      existingPlan,
    });
  }

  return gaps;
}

function calculatePriorityScore(gap) {
  let score = 0;

  // 1. Evidence gap weight
  if (gap.currentEvidence === "none") score += 35;
  else if (gap.currentEvidence === "self_reported") score += 25;
  else if (gap.currentEvidence === "detected") score += 15;
  else if (gap.currentEvidence === "strong") score += 5;
  else if (gap.currentEvidence === "verified") score -= 100;

  // 2. Target role weight
  if (gap.targetRoleRelevance === "HIGH") score += 25;
  else if (gap.targetRoleRelevance === "MEDIUM") score += 15;
  else score += 5;

  // 3. Company type weight
  if (gap.companyTypeRelevance === "HIGH") score += 20;
  else if (gap.companyTypeRelevance === "MEDIUM") score += 10;
  else score += 0;

  // 4. Target company weight (evidence-backed only)
  if (gap.targetCompanyMatch) score += 15;

  // 5. Alumni frequency weight (0 to 20)
  score += Math.round((gap.alumniFrequency || 0) * 20);

  // 6. Job requirement weight (0 to 20)
  score += Math.round((gap.jobFrequency || 0) * 20);

  // 7. Readiness & domain competency impact
  if (gap.category === "core_cs" || gap.category === "problem_solving") score += 10;
  if (["development", "databases"].includes(gap.category)) score += 5;

  // 8. Roadmap status penalty/filter
  if (gap.roadmapStatus === "in_progress") {
    score -= 15; // Still eligible for top 3 as "Continue plan", but prioritized below fresh critical gaps
  }
  if (gap.roadmapStatus === "completed" || gap.currentEvidence === "verified") {
    score -= 150; // Filtered out
  }

  return score;
}

function selectTopUnlocks(gaps, options = {}) {
  const scoredGaps = gaps.map((gap) => ({
    ...gap,
    priorityScore: calculatePriorityScore(gap),
  }));

  // Filter out verified/completed and low-confidence noise
  const eligible = scoredGaps.filter(
    (gap) => gap.currentEvidence !== "verified" && gap.roadmapStatus !== "completed" && gap.priorityScore > 20
  );

  // Deterministic sorting:
  // 1. priorityScore descending
  // 2. targetRoleRelevance HIGH before others
  // 3. combined alumni + job frequency descending
  // 4. alphabetical by skillId
  eligible.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    const aRole = a.targetRoleRelevance === "HIGH" ? 2 : a.targetRoleRelevance === "MEDIUM" ? 1 : 0;
    const bRole = b.targetRoleRelevance === "HIGH" ? 2 : b.targetRoleRelevance === "MEDIUM" ? 1 : 0;
    if (bRole !== aRole) return bRole - aRole;
    const aFreq = a.alumniFrequency + a.jobFrequency;
    const bFreq = b.alumniFrequency + b.jobFrequency;
    if (bFreq !== aFreq) return bFreq - aFreq;
    return a.skillId.localeCompare(b.skillId);
  });

  const top3 = eligible.slice(0, 3);

  return top3.map((gap) => {
    const isCritical = gap.priorityScore >= 75 || gap.targetRoleRelevance === "HIGH";

    // Build dynamic human-readable explanation
    const reasons = [];
    if (gap.targetRoleRelevance === "HIGH") {
      reasons.push("Required by your target role");
    }
    if (gap.companyTypeRelevance === "HIGH") {
      reasons.push("High priority for your target company category");
    }
    if (gap.alumniMatchedCount > 0) {
      reasons.push(`Prepared by ${gap.alumniMatchedCount}/${gap.alumniTotalCount} closest placed seniors`);
    }
    if (gap.jobFrequency > 0.4) {
      reasons.push(`Required in ${Math.round(gap.jobFrequency * 100)}% of matched job openings`);
    }
    if (gap.targetCompanyMatch) {
      reasons.push("Directly required by your target company");
    }

    const explanation = reasons.length > 0 ? reasons.join(" · ") : "Recommended to accelerate placement readiness.";

    return {
      skillId: gap.skillId,
      skillName: gap.skillName,
      importance: isCritical ? "critical" : "recommended",
      priority: isCritical ? "high" : "medium",
      priorityScore: gap.priorityScore,
      evidenceStatus: gap.currentEvidence,
      studentEvidence: gap.currentEvidence === "none" ? "none" : gap.currentEvidence === "self_reported" ? "self_reported" : "detected",
      roadmapStatus: gap.roadmapStatus,
      plan: gap.existingPlan || null,
      reason: {
        targetRoleRequired: gap.targetRoleRelevance === "HIGH",
        companyTypeWeight: gap.companyTypeRelevance === "HIGH" ? 0.9 : gap.companyTypeRelevance === "MEDIUM" ? 0.5 : 0.2,
        targetCompanyMatch: gap.targetCompanyMatch,
        alumniMatched: gap.alumniMatchedCount,
        alumniTotal: gap.alumniTotalCount,
        jobFrequency: gap.jobFrequency,
        explanation,
      },
    };
  });
}

function checkProfileCompleteness(profile) {
  const missing = [];
  if (!profile.targetRole) missing.push("target_role");
  const hasSkills = Array.isArray(profile.skills) && profile.skills.length > 0;
  const hasProjects = (profile.projectDetails && profile.projectDetails.length > 0) || Number(profile.projects) > 0;
  const hasDsa = Number(profile.leetcodeStats?.totalSolved) > 0 || Number(profile.dsaSolved) > 0;
  const hasGithub = Number(profile.githubStats?.publicRepos) > 0 || (profile.activityCalendar && profile.activityCalendar.length > 0);

  if (!hasSkills && !hasProjects && !hasDsa && !hasGithub) {
    missing.push("evidence");
  }

  return {
    isComplete: missing.length === 0,
    missing,
  };
}

module.exports = {
  checkProfileCompleteness,
  calculateSkillGaps,
  calculatePriorityScore,
  selectTopUnlocks,
  extractStudentEvidence,
  computeAlumniFrequency,
  computeJobRequirementFrequency,
  evaluateCompanyTypeRelevance,
};
