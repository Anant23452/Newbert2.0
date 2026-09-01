const crypto = require("crypto");
const { buildSkillEvidence } = require("../skillEvidenceService");
const { normalizeSkill } = require("../skillNormalizationService");
const {
  EVIDENCE_CONFIDENCE_POINTS,
  GAP_POINTS,
  PRIORITY_BANDS,
  SENIOR_SUPPORT_POINTS,
  TARGET_IMPORTANCE_POINTS,
} = require("../../config/preparationIntelligenceConfig");
const { categoryFor, CATEGORY_LABELS } = require("../targetBenchmarkService");

function list(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Separates evidence state from ability state
 */
function deriveStates(item) {
  if (!item) {
    return {
      evidenceState: "unknown",
      evidenceKind: "unknown",
      abilityState: "unknown",
      position: "unknown",
      evidenceConfidence: "low",
    };
  }

  const sources = list(item.sources);
  const hasVerified = sources.some((s) => ["github", "project", "leetcode", "assessment"].includes(s.source));
  const hasProfileOnly = sources.every((s) => s.source === "profile");
  const score = Number(item.score) || 0;

  let evidenceState = "unknown";
  let evidenceKind = "unknown";
  let abilityState = "unknown";
  let position = "unknown";
  let evidenceConfidence = "low";

  if (hasVerified) {
    if (score >= 65) {
      evidenceState = "strong_evidence";
      evidenceKind = "verified";
      abilityState = "strong";
      position = "strong";
      evidenceConfidence = "high";
    } else {
      evidenceState = "some_evidence";
      evidenceKind = "inferred";
      abilityState = "developing";
      position = "developing";
      evidenceConfidence = "medium";
    }
  } else if (hasProfileOnly || item.sources?.length) {
    evidenceState = "self_reported";
    evidenceKind = "self_reported";
    abilityState = "unverified";
    position = "needs_verification";
    evidenceConfidence = "low";
  }

  return {
    evidenceState,
    evidenceKind,
    abilityState,
    position,
    evidenceConfidence,
  };
}

function categoryEvidence(profile = {}) {
  const evidence = buildSkillEvidence(profile);
  const map = new Map();

  for (const skill of evidence.skills) {
    const keys = new Set([categoryFor({ skill: skill.normalizedSkill, category: null })]);
    if (/javascript|typescript|python|java|cplusplus|programming/.test(skill.normalizedSkill)) keys.add("programming");
    if (/javascript|typescript|react|nextjs|tailwind|html|css/.test(skill.normalizedSkill)) keys.add("frontend");
    if (/node|express|mongodb|mongoose|postgresql|mysql|redis|prisma|spring|django|flask|fastapi|restapi/.test(skill.normalizedSkill)) keys.add("backend");
    if (/mongodb|mongoose|postgresql|mysql|redis|prisma|sql|dbms/.test(skill.normalizedSkill)) keys.add("dbms");

    for (const key of keys) {
      const current = map.get(key);
      if (!current || skill.score > current.score) {
        map.set(key, { ...skill, key });
      }
    }
  }

  const projects = evidence.projects;
  if (projects?.score != null || projects?.count != null) {
    const hasVerifiedProjects = projects.structured?.some((p) => p.source === "github" || p.evidence?.hasRepository);
    const score = projects.score ?? (projects.count > 0 ? 15 : 0);
    map.set("projects", {
      key: "projects",
      skill: "Projects",
      score,
      sources: hasVerifiedProjects
        ? [{ source: "project", evidence: `${projects.structured.length} verified structured project(s)` }]
        : projects.structured?.length
        ? [{ source: "project", evidence: `${projects.structured.length} project record(s)` }]
        : [{ source: "profile", evidence: `${projects.count} self-reported project(s)` }],
    });
  }

  return { evidence, map };
}

function buildCurrentPosition(profile, benchmark) {
  const { evidence, map } = categoryEvidence(profile);

  const categories = list(benchmark?.categories).map((targetCategory) => {
    const item = map.get(targetCategory.key);
    const states = deriveStates(item);
    const score = item?.score ?? 0;

    let limitation = null;
    if (states.evidenceState === "unknown") {
      limitation = "Newbert does not have evidence for this area yet.";
    } else if (states.evidenceState === "self_reported") {
      limitation = "Listed in your profile but not yet supported by connected GitHub repositories, project proofs, or assessments.";
    }

    return {
      key: targetCategory.key,
      label: targetCategory.label || CATEGORY_LABELS[targetCategory.key] || targetCategory.key,
      position: states.position,
      abilityState: states.abilityState,
      evidenceState: states.evidenceState,
      evidenceKind: states.evidenceKind,
      evidenceConfidence: states.evidenceConfidence,
      score,
      evidence: list(item?.sources).map((source) => ({ source: source.source, detail: source.evidence || null })),
      limitation,
    };
  });

  return { categories, sourceSummary: evidence, generatedAt: new Date() };
}

function seniorSupportFor(categoryKey, alumni = []) {
  const real = list(alumni).filter((item) => item.verified && !item.isDummyData);
  if (!real.length) return { level: "none", count: 0, cohort: 0 };
  const count = real.filter((senior) => {
    const values = [
      ...list(senior.skills),
      ...list(senior.csFundamentals),
      ...list(senior.placementPreparation?.development?.skills),
      ...list(senior.placementPreparation?.csFundamentals?.subjects),
    ];
    return values.some((value) => categoryFor({ skill: normalizeSkill(value) }) === categoryKey);
  }).length;
  return { level: count >= 2 && count / real.length >= 0.5 ? "common" : count ? "present" : "none", count, cohort: real.length };
}

/**
 * 5 Distinct Gap Types:
 * - ready: student evidence meets/exceeds target -> moves to Already Covered
 * - optional: low target importance -> not priority
 * - validation_needed: unknown state for high/critical target -> needs baseline assessment
 * - evidence_gap: self-reported or unverified for high/critical target -> needs code/repo proof
 * - knowledge_gap: verified evidence demonstrates weak proficiency -> needs study & practice
 * - target_gap: verified developing proficiency is below critical target requirement
 */
function gapTypeFor(target, current) {
  if (["low"].includes(target.importance)) return "optional";
  if (current.position === "strong") return "ready";
  if (current.evidenceKind === "unknown" || current.evidenceState === "unknown") return "validation_needed";
  if (current.evidenceKind === "self_reported" || current.evidenceState === "self_reported" || current.position === "needs_verification") {
    return "evidence_gap";
  }
  if (current.position === "weak") return "knowledge_gap";
  if (current.position === "developing" && (target.importance === "critical" || target.importance === "high")) {
    return "target_gap";
  }
  return "ready";
}

function buildPreparationGaps({ benchmark, currentPosition, alumni = [] }) {
  const currentByKey = new Map(list(currentPosition?.categories).map((item) => [item.key, item]));

  return list(benchmark?.categories).map((target) => {
    const current = currentByKey.get(target.key) || {
      key: target.key,
      label: target.label,
      position: "unknown",
      evidenceKind: "unknown",
      evidenceState: "unknown",
      evidenceConfidence: "low",
      evidence: [],
    };

    const gapType = gapTypeFor(target, current);
    const seniorSupport = seniorSupportFor(target.key, alumni);
    
    // Scoring
    const score = (gapType === "ready" || gapType === "optional") ? 0
      : (TARGET_IMPORTANCE_POINTS[target.importance] || 0) +
        (GAP_POINTS[gapType] || 25) +
        (EVIDENCE_CONFIDENCE_POINTS[target.confidence] || 0) +
        (SENIOR_SUPPORT_POINTS[seniorSupport.level] || 0);

    const priority = score >= PRIORITY_BANDS.high ? "high" : score >= PRIORITY_BANDS.medium ? "medium" : "low";

    let reason = "";
    if (gapType === "ready") {
      reason = "Strong evidence currently meets or exceeds the target benchmark.";
    } else if (gapType === "optional") {
      reason = "Not a current priority for the selected target.";
    } else if (gapType === "evidence_gap") {
      reason = "Important to your target, but Newbert currently has only self-reported or unverified evidence.";
    } else if (gapType === "validation_needed") {
      reason = "Your target values this area, but your current baseline level is unknown.";
    } else if (gapType === "knowledge_gap") {
      reason = "Demonstrated performance is below the required target threshold; structured practice recommended.";
    } else {
      reason = "Target expects high proficiency; focused gap closure recommended.";
    }

    return {
      id: `gap-${target.key}`,
      categoryKey: target.key,
      label: target.label,
      importance: target.importance,
      classification: target.importance === "low" ? "optional" : target.importance === "medium" ? "recommended" : "required",
      gapType,
      rootGapType: gapType,
      priority,
      priorityScore: score,
      current,
      target,
      seniorSupport,
      reason,
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore || a.label.localeCompare(b.label));
}

const PHASE_BY_CATEGORY = Object.freeze({
  dbms: "foundations",
  oop: "foundations",
  operatingSystems: "foundations",
  computerNetworks: "foundations",
  csFundamentals: "foundations",
  dsa: "targeted-dsa",
  programming: "foundations",
  projects: "development-evidence",
  development: "development-evidence",
  frontend: "development-evidence",
  backend: "development-evidence",
  cloud: "development-evidence",
  devops: "development-evidence",
  systemDesign: "project-interview",
  communication: "project-interview",
  interviewPreparation: "target-simulation",
  aptitude: "target-simulation",
  engineeringMathematics: "gate-foundations",
  coreSubjects: "gate-foundations",
  pyq: "gate-practice",
  mockTests: "gate-mocks",
  revision: "gate-revision",
});

const PHASES = Object.freeze([
  ["foundations", "Close Interview Foundations"],
  ["targeted-dsa", "Targeted Problem Solving"],
  ["development-evidence", "Development & Portfolio Evidence"],
  ["project-interview", "Project & Architecture Interview Prep"],
  ["target-simulation", "Target Simulation & Technical Mocks"],
  ["gate-foundations", "GATE Foundations"],
  ["gate-practice", "PYQ Practice"],
  ["gate-mocks", "Mock-Test Practice"],
  ["gate-revision", "Revision Cycles"],
]);

function milestoneId(gap) {
  return `milestone-${crypto.createHash("sha1").update(gap.categoryKey).digest("hex").slice(0, 10)}`;
}

/**
 * Specific completion criteria per category (Part 14)
 */
function completionRule(gap) {
  if (gap.gapType === "evidence_gap") {
    if (gap.categoryKey === "programming") {
      return "Done when verified GitHub repository code or a programming skill check confirms core language proficiency.";
    }
    if (gap.categoryKey === "projects") {
      return "Done when at least 2 structured projects with public repositories or live deployments are verified.";
    }
    return "Done when you add reviewable evidence from a connected GitHub repository, structured project, or relevant assessment.";
  }

  if (gap.gapType === "validation_needed") {
    if (gap.categoryKey === "csFundamentals" || gap.categoryKey === "dbms" || gap.categoryKey === "oop") {
      return "Done when a CS fundamentals baseline check establishes your initial topic coverage.";
    }
    return "Done when an initial baseline assessment or verified project proof establishes your starting level.";
  }

  if (gap.categoryKey === "csFundamentals" || gap.categoryKey === "dbms") {
    return "Done when core concepts (DBMS normalization, indexing, ACID transactions, OOP design) are demonstrated.";
  }

  if (gap.categoryKey === "dsa") {
    return "Done when core pattern proficiency (arrays, strings, trees, graphs, DP) is verified through accepted solutions.";
  }

  if (gap.categoryKey === "projects" || gap.categoryKey === "development" || gap.categoryKey === "backend" || gap.categoryKey === "frontend") {
    return "Done when production-quality features (APIs, state management, DB schemas) are verified in code.";
  }

  return "Done when reviewable work or assessment confirms proficiency meeting the target benchmark.";
}

function effortFor(gap) {
  if (gap.gapType === "validation_needed" || gap.gapType === "evidence_gap") {
    return "1-3 focused hours (verification)";
  }
  return gap.priority === "high" ? "6-10 focused hours" : gap.priority === "medium" ? "3-6 focused hours" : "2-4 focused hours";
}

function buildMilestoneStrategy({ gaps, existingMilestones = [] }) {
  const previous = new Map(list(existingMilestones).map((item) => [item.id, item.toObject ? item.toObject() : item]));
  
  // Exclude ready (already covered) and optional items from active milestones
  const actionable = list(gaps).filter((gap) => !["ready", "optional"].includes(gap.gapType)).slice(0, 8);

  const milestones = actionable.map((gap) => {
    const id = milestoneId(gap);
    const old = previous.get(id) || {};

    let what = `Strengthen ${gap.label} for the selected target.`;
    let whatRemains = "Build and demonstrate target-relevant fundamentals.";
    if (gap.gapType === "evidence_gap") {
      what = `Verify ${gap.label}`;
      whatRemains = `Provide reviewable code or project evidence for ${gap.label} before Newbert assumes a knowledge weakness.`;
    } else if (gap.gapType === "validation_needed") {
      what = `Establish ${gap.label} Baseline`;
      whatRemains = `Complete a baseline check to identify any genuine gaps in ${gap.label}.`;
    }

    return {
      id,
      phaseId: PHASE_BY_CATEGORY[gap.categoryKey] || "development-evidence",
      title: gap.label,
      what,
      why: gap.reason,
      currentState: gap.current.position,
      targetState: gap.target.importance,
      whatRemains,
      doneWhen: completionRule(gap),
      estimatedEffort: effortFor(gap),
      priority: gap.priority,
      classification: gap.classification,
      gapType: gap.gapType,
      categoryKey: gap.categoryKey,
      evidence: gap.target.evidence || [],
      status: ["not_started", "in_progress", "completed", "skipped"].includes(old.status) ? old.status : "not_started",
      completedAt: old.completedAt || null,
    };
  });

  const activeIds = new Set(milestones.map((item) => item.id));
  const history = list(existingMilestones)
    .filter((item) => !activeIds.has(item.id) && ["completed", "skipped"].includes(item.status))
    .map((item) => ({ ...(item.toObject ? item.toObject() : item), archived: true }));

  const phases = PHASES.map(([id, title], index) => {
    const items = milestones.filter((milestone) => milestone.phaseId === id);
    return items.length
      ? {
          id,
          title,
          order: index + 1,
          milestoneIds: items.map((item) => item.id),
          goals: items.map((item) => item.title),
        }
      : null;
  }).filter(Boolean);

  return { phases, milestones: [...milestones, ...history] };
}

function deriveAlreadyCovered(gaps) {
  return list(gaps)
    .filter((g) => g.gapType === "ready")
    .map((g) => ({
      key: g.categoryKey,
      label: g.label,
      position: g.current.position,
      reason: "Strong verified evidence currently meets the role benchmark.",
    }));
}

function deriveNextBestMove(gaps, milestones) {
  const activeGaps = list(gaps).filter((g) => !["ready", "optional"].includes(g.gapType));
  if (!activeGaps.length) return null;

  const top = activeGaps[0];
  const milestone = milestones.find((m) => m.categoryKey === top.categoryKey && !m.archived);

  let title = `Focus on ${top.label}`;
  let actionLabel = "Start Milestone";
  let actionType = "milestone";
  let actions = [];

  if (top.gapType === "evidence_gap") {
    title = `Verify ${top.label}`;
    actions = [
      { label: "Analyze GitHub Projects", action: "github_projects", href: "/profile#featured-projects" },
      { label: "Take Skill Check", action: "assessment", href: "/courses" },
    ];
  } else if (top.gapType === "validation_needed") {
    title = `Establish ${top.label} Baseline`;
    actions = [
      { label: "Take Baseline Check", action: "assessment", href: "/courses" },
      { label: "Add Profile Evidence", action: "profile", href: "/profile" },
    ];
  } else {
    title = `Strengthen ${top.label}`;
    actions = [
      { label: "Start Milestone", action: "milestone", milestoneId: milestone?.id },
      { label: "View Matching Resources", action: "courses", href: "/courses" },
    ];
  }

  return {
    title,
    categoryKey: top.categoryKey,
    gapType: top.gapType,
    why: top.reason,
    milestoneId: milestone?.id || null,
    actions,
  };
}

function deriveConfidenceActions(target, currentPosition, profileSnapshot) {
  const actions = [];
  
  if (!target.company) {
    actions.push({
      title: "Choose a target company",
      reason: "Make the expectation benchmark specific rather than relying on an exploratory role baseline.",
      action: "change_target",
    });
  }

  const hasProjectEvidence = currentPosition.categories?.some(
    (c) => c.key === "projects" && (c.position === "strong" || c.evidenceKind === "verified")
  );
  if (!hasProjectEvidence) {
    actions.push({
      title: "Analyze GitHub projects",
      reason: "Inspect repository manifests and source code to verify framework & API development evidence.",
      action: "github_projects",
    });
  }

  const csCategory = currentPosition.categories?.find((c) => c.key === "csFundamentals" || c.key === "dbms");
  if (csCategory && (csCategory.position === "unknown" || csCategory.evidenceKind === "unknown")) {
    actions.push({
      title: "Complete CS fundamentals baseline",
      reason: "Record your DBMS, OOP, and Operating Systems preparation so Newbert does not assume a gap.",
      action: "assessment",
    });
  }

  if (!profileSnapshot?.leetcode?.username) {
    actions.push({
      title: "Connect LeetCode profile",
      reason: "Sync your problem-solving count to provide verifiable DSA evidence.",
      action: "connect_leetcode",
    });
  }

  return actions.slice(0, 3);
}

function overallReadiness(currentPosition) {
  const known = list(currentPosition?.categories).filter((item) => item.evidenceKind !== "unknown");
  if (!known.length) return "insufficient_evidence";
  const strong = known.filter((item) => item.position === "strong").length;
  const weak = known.filter((item) => ["weak"].includes(item.position)).length;
  if (strong === known.length) return "target_ready";
  if (strong >= Math.ceil(known.length * 0.6) && weak === 0) return "near_target";
  return strong ? "building" : "early";
}

module.exports = {
  buildCurrentPosition,
  buildMilestoneStrategy,
  buildPreparationGaps,
  deriveAlreadyCovered,
  deriveNextBestMove,
  deriveConfidenceActions,
  overallReadiness,
};
