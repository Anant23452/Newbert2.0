const { normalizeSkill, normalizeSkillList } = require("./skillNormalizationService");

const WEIGHTS = Object.freeze({
  gapCoverage: 45,
  targetRelevance: 25,
  levelFit: 15,
  courseQuality: 10,
  preferenceValue: 5,
});

const GAP_PRIORITY_MULTIPLIERS = Object.freeze({
  critical: 1.5,
  high: 1.25,
  medium: 1.0,
  low: 0.7,
  role_baseline: 1.1,
  default: 1.0,
});

/**
 * Normalizes text for comparison
 */
function norm(str) {
  return String(str || "").toLowerCase().trim();
}

/**
 * Extracts student gaps from plan, prioritized gaps, and target benchmark
 */
function extractStudentGaps(plan = null, profile = {}) {
  const gapsList = [];
  const seenSkills = new Set();

  if (plan) {
    // 1. Plan prioritized gaps
    const rawGaps = [...(plan.gaps || []), ...(plan.prioritizedGaps || []), ...(plan.preparationGaps || [])];
    for (const g of rawGaps) {
      const skill = g.skill || g.label || g.name || g.key;
      const normalized = normalizeSkill(skill);
      if (normalized && !seenSkills.has(normalized)) {
        seenSkills.add(normalized);
        const priority = norm(g.priority || g.severity || "medium");
        gapsList.push({
          skill: g.label || g.skill || skill,
          normalizedSkill: normalized,
          priority,
          priorityScore: Number(g.priorityScore) || 50,
          category: g.category || "skill_gap",
          reasons: g.reasons || [],
        });
      }
    }
  }

  // 2. If no plan gaps, derive from profile skills with low scores
  if (!gapsList.length && profile.skills?.length) {
    for (const s of profile.skills) {
      const name = typeof s === "string" ? s : s.name;
      const score = Number(s.score) || 0;
      const normalized = normalizeSkill(name);
      if (normalized && score < 50 && !seenSkills.has(normalized)) {
        seenSkills.add(normalized);
        gapsList.push({
          skill: name,
          normalizedSkill: normalized,
          priority: score < 25 ? "high" : "medium",
          priorityScore: 50 - score,
          category: "skill_gap",
        });
      }
    }
  }

  return gapsList;
}

/**
 * Calculates deterministic Course Fit for a given course against student profile and roadmap plan.
 */
function calculateCourseFit(course, profile = {}, plan = null, reviews = []) {
  const studentGaps = extractStudentGaps(plan, profile);
  
  // Extract student known / verified skills from profile, project details, and GitHub stats
  const projectTechs = (profile.projectDetails || profile.projectsDetail || []).flatMap((p) => [
    ...(p.technologies || []),
    ...(p.confirmedTechnologies || []),
    ...(p.detectedTechnologies || []).map((t) => t.name || t.canonical),
  ]);
  
  const studentKnownSkills = new Set(
    normalizeSkillList([
      ...(profile.skills || []),
      ...(profile.githubStats?.languages || []),
      ...projectTechs,
    ])
  );

  const courseSkills = normalizeSkillList([
    ...(course.skillsCovered || []),
    ...(course.topicsCovered || []),
  ]);
  const courseSkillsSet = new Set(courseSkills);

  // Check if course skills are already strongly evidenced in projects
  const verifiedProjectSkills = new Set(
    (profile.projectDetails || profile.projectsDetail || [])
      .flatMap((p) => (p.detectedTechnologies || []).filter((t) => t.level === "VERIFIED_PROJECT_USAGE" || t.level === "STUDENT_CONFIRMED").map((t) => t.canonical || normalizeSkill(t.name)))
  );

  const allCourseSkillsAlreadyEvidenced = courseSkills.length > 0 && courseSkills.every((s) => verifiedProjectSkills.has(s) || studentKnownSkills.has(s));

  // 1. GAP COVERAGE SCORE (45%)
  let totalGapWeight = 0;
  let coveredGapWeight = 0;
  const coveredGaps = [];
  const uncoveredGaps = [];

  for (const gap of studentGaps) {
    const multiplier = GAP_PRIORITY_MULTIPLIERS[gap.priority] || GAP_PRIORITY_MULTIPLIERS.default;
    const weight = multiplier * (gap.priorityScore || 50);
    totalGapWeight += weight;

    // Check if course covers this gap directly or via related topics
    const isCovered = courseSkillsSet.has(gap.normalizedSkill) ||
      (course.topicsCovered || []).some((t) => norm(t).includes(norm(gap.skill)) || norm(gap.skill).includes(norm(t))) ||
      (course.description && norm(course.description).includes(norm(gap.skill)));

    if (isCovered) {
      coveredGapWeight += weight;
      coveredGaps.push(gap.skill);
    } else {
      uncoveredGaps.push(gap.skill);
    }
  }

  // Calculate gap coverage (0-100)
  let gapScore = 0;
  if (studentGaps.length > 0) {
    gapScore = totalGapWeight > 0 ? Math.round((coveredGapWeight / totalGapWeight) * 100) : 0;
  } else {
    // If student has no recorded gaps, score by overlap with unlearned skills
    const unlearnedCount = courseSkills.filter((s) => !studentKnownSkills.has(s)).length;
    gapScore = courseSkills.length > 0 ? Math.round((unlearnedCount / courseSkills.length) * 80) : 50;
  }

  // If all skills in this course are already evidenced in projects and there is no gap in them, reduce gapScore substantially
  if (allCourseSkillsAlreadyEvidenced && coveredGaps.length === 0) {
    gapScore = Math.min(gapScore, 20);
  }

  // 2. TARGET RELEVANCE SCORE (25%)
  const targetRole = norm(plan?.target?.role || profile.targetRole || "software engineer");
  const targetType = norm(plan?.target?.type || "placement");
  const courseGoals = (course.goals || []).map(norm);
  const courseTargetRoles = (course.targetRoles || []).map(norm);
  const allCourseRoles = [...courseGoals, ...courseTargetRoles];

  let targetScore = 40; // baseline
  const isDirectTargetMatch = allCourseRoles.some((r) => r.includes(targetRole) || targetRole.includes(r));
  const isCategoryMatch = allCourseRoles.some((r) => r.includes("sde") || r.includes("developer") || r.includes("engineer")) &&
    (targetRole.includes("sde") || targetRole.includes("developer") || targetRole.includes("engineer"));

  if (isDirectTargetMatch) {
    targetScore = 100;
  } else if (isCategoryMatch) {
    targetScore = 75;
  } else if (course.category && targetRole.includes(norm(course.category))) {
    targetScore = 70;
  }

  // 3. LEVEL FIT SCORE (15%)
  const coveredKnownCount = courseSkills.filter((s) => studentKnownSkills.has(s)).length;
  const knowledgeRatio = courseSkills.length > 0 ? coveredKnownCount / courseSkills.length : 0;
  let levelScore = 80;

  if (course.level === "beginner") {
    if (knowledgeRatio >= 0.75) {
      levelScore = 30; // Student already knows most of this -> low fit, revision only
    } else {
      levelScore = 95;
    }
  } else if (course.level === "intermediate") {
    if (knowledgeRatio >= 0.25 && knowledgeRatio <= 0.8) {
      levelScore = 95; // Ideal intermediate transition
    } else if (knowledgeRatio < 0.25) {
      levelScore = 70;
    } else {
      levelScore = 65;
    }
  } else if (course.level === "advanced") {
    if (knowledgeRatio >= 0.6) {
      levelScore = 90;
    } else {
      levelScore = 40; // Too advanced for current student baseline
    }
  } else {
    levelScore = 80; // all-levels
  }

  // 4. COURSE QUALITY SCORE (10%)
  const verifiedReviews = reviews.filter((r) => r.verifiedReviewer);
  const avgRating = course.reviewStats?.averageRating || (reviews.length ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length : 4.5);
  const reviewCount = course.reviewStats?.reviewCount || reviews.length || 10;
  
  const ratingPoints = Math.min(100, Math.round((avgRating / 5) * 80));
  const reviewCountPoints = Math.min(20, Math.round(Math.log10(reviewCount + 1) * 10));
  const qualityScore = Math.min(100, ratingPoints + reviewCountPoints);

  // 5. PREFERENCE & VALUE FIT (5%)
  let valueScore = course.priceType === "free" ? 100 : 70;
  if (course.estimatedHours && course.estimatedHours <= 20) {
    valueScore = Math.min(100, valueScore + 10);
  }

  // NOTE: isAffiliate is strictly excluded from scoring for complete neutrality.

  // WEIGHTED TOTAL
  const weightedSum =
    (gapScore * WEIGHTS.gapCoverage) +
    (targetScore * WEIGHTS.targetRelevance) +
    (levelScore * WEIGHTS.levelFit) +
    (qualityScore * WEIGHTS.courseQuality) +
    (valueScore * WEIGHTS.preferenceValue);

  const totalWeight = WEIGHTS.gapCoverage + WEIGHTS.targetRelevance + WEIGHTS.levelFit + WEIGHTS.courseQuality + WEIGHTS.preferenceValue;
  const fitScore = Math.round(weightedSum / totalWeight);

  // FIT LABEL
  const fitLabel = fitScore >= 85
    ? "Best Match"
    : fitScore >= 75
    ? "Strong Fit"
    : fitScore >= 60
    ? "Good Fit"
    : "Optional Resource";

  // HUMAN-READABLE REASONS
  const reasons = [];
  if (coveredGaps.length > 0) {
    reasons.push(`✓ Covers your priority gaps in ${coveredGaps.slice(0, 3).join(", ")}`);
  }
  if (isDirectTargetMatch) {
    reasons.push(`✓ Highly relevant to your target role (${plan?.target?.role || profile.targetRole || "Software Engineer"})`);
  }
  if (levelScore >= 85) {
    reasons.push(`✓ Matches your current ${course.level} skill level`);
  }
  if (course.priceType === "free") {
    reasons.push("✓ High-quality free learning resource");
  }
  if (allCourseSkillsAlreadyEvidenced && coveredGaps.length === 0) {
    reasons.push("○ Already evidenced through your projects. No beginner course needed.");
  } else if (knowledgeRatio >= 0.75 && course.level === "beginner") {
    reasons.push("○ Foundational content (good for quick revision)");
  }

  return {
    fitScore,
    fitLabel,
    reasons,
    coveredGaps,
    uncoveredGaps: uncoveredGaps.slice(0, 5),
    fitBreakdown: {
      gapCoverage: gapScore,
      targetRelevance: targetScore,
      levelFit: levelScore,
      courseQuality: qualityScore,
      preferenceValue: valueScore,
    },
    recommendationType: fitScore >= 85 ? "best_match" : "gap_closer",
  };
}

/**
 * Builds personalized top recommendations and checks if "No Course Required" applies.
 */
function buildPersonalizedRecommendations(courses = [], profile = {}, plan = null, reviewsMap = new Map()) {
  const studentGaps = extractStudentGaps(plan, profile);
  
  // Score all available courses
  const scoredCourses = courses
    .filter((c) => c.active !== false)
    .map((course) => {
      const courseReviews = reviewsMap.get(String(course._id)) || [];
      const match = calculateCourseFit(course, profile, plan, courseReviews);
      return {
        course,
        match,
      };
    })
    .sort((a, b) => b.match.fitScore - a.match.fitScore);

  // Check "No Course Required" intelligence:
  // If student's main gaps are minor, or only graph/DSA problem count needed, or readiness already very high (>85%)
  const hasOnlyProblemGaps = studentGaps.length > 0 && studentGaps.every((g) => {
    const s = norm(g.skill);
    return s.includes("graph") || s.includes("tree") || s.includes("dsa") || s.includes("problem");
  });
  const highReadiness = Number(plan?.readiness?.total) >= 85;

  let noCourseAdvisory = null;
  if (highReadiness || (hasOnlyProblemGaps && studentGaps.length <= 2)) {
    noCourseAdvisory = {
      recommended: false,
      title: "Targeted Problem Practice Recommended",
      message: "Your foundational knowledge is solid. Newbert recommends solving 8–10 targeted problems and a revision session instead of committing to a full course.",
      suggestedAction: "Practice Targeted Problems in Roadmap",
    };
  }

  // Extract Strategic Picks:
  // 1. Best Match (highest fit score)
  const bestMatch = scoredCourses[0] || null;

  // 2. Fastest Gap Closer (highest gap score per hour)
  const fastestCloser = [...scoredCourses]
    .filter((sc) => sc.course.estimatedHours && sc.course.estimatedHours <= 15 && sc.match.fitScore >= 65)
    .sort((a, b) => {
      const rateA = (a.match.fitBreakdown.gapCoverage || 50) / (a.course.estimatedHours || 10);
      const rateB = (b.match.fitBreakdown.gapCoverage || 50) / (b.course.estimatedHours || 10);
      return rateB - rateA;
    })[0] || null;

  // 3. Best Free Option
  const bestFree = scoredCourses.find((sc) => sc.course.priceType === "free" && sc.match.fitScore >= 60) || null;

  return {
    bestMatch,
    fastestCloser: fastestCloser && fastestCloser.course._id !== bestMatch?.course._id ? fastestCloser : null,
    bestFree: bestFree && bestFree.course._id !== bestMatch?.course._id && bestFree.course._id !== fastestCloser?.course._id ? bestFree : null,
    allScored: scoredCourses,
    noCourseAdvisory,
    studentGapsCount: studentGaps.length,
  };
}

module.exports = {
  WEIGHTS,
  calculateCourseFit,
  buildPersonalizedRecommendations,
  extractStudentGaps,
};
