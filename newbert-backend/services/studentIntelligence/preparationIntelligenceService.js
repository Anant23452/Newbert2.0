const crypto = require("crypto");
const { buildSkillEvidence } = require("../skillEvidenceService");
const { normalizeSkill } = require("../skillNormalizationService");
const {
  EVIDENCE_CONFIDENCE_POINTS, GAP_POINTS, PRIORITY_BANDS,
  SENIOR_SUPPORT_POINTS, TARGET_IMPORTANCE_POINTS,
} = require("../../config/preparationIntelligenceConfig");
const { categoryFor, CATEGORY_LABELS } = require("../targetBenchmarkService");

function list(value) { return Array.isArray(value) ? value : []; }
function labelState(score) { return score >= 65 ? "strong" : score >= 25 ? "developing" : score > 0 ? "weak_evidence" : "unknown"; }
function evidenceKind(item) {
  if (!item) return "unknown";
  const sources = list(item.sources);
  if (sources.some((source) => ["github", "project", "leetcode", "assessment"].includes(source.source))) return item.score >= 45 ? "verified" : "inferred";
  return sources.some((source) => source.source === "profile") ? "self_reported" : "unknown";
}
function confidenceFor(kind) { return kind === "verified" ? "high" : kind === "inferred" ? "medium" : "low"; }
function categoryEvidence(profile = {}) {
  const evidence = buildSkillEvidence(profile);
  const map = new Map();
  for (const skill of evidence.skills) {
    const keys = new Set([categoryFor({ skill: skill.normalizedSkill, category: null })]);
    if (/javascript|typescript|python|java|cplusplus|programming/.test(skill.normalizedSkill)) keys.add("programming");
    if (/javascript|typescript|react|html|css/.test(skill.normalizedSkill)) keys.add("frontend");
    if (/node|express|spring|django|flask|fastapi|restapi/.test(skill.normalizedSkill)) keys.add("backend");
    for (const key of keys) {
      const current = map.get(key);
      if (!current || skill.score > current.score) map.set(key, { ...skill, key });
    }
  }
  const projects = evidence.projects;
  if (projects?.score != null || projects?.count != null) {
    const score = projects.score ?? (projects.count > 0 ? 15 : 0);
    map.set("projects", { key: "projects", skill: "Projects", score, sources: projects.structured?.length ? [{ source: "project", evidence: `${projects.structured.length} structured project record(s)` }] : [{ source: "profile", evidence: `${projects.count} self-reported project(s)` }] });
  }
  return { evidence, map };
}

function buildCurrentPosition(profile, benchmark) {
  const { evidence, map } = categoryEvidence(profile);
  const categories = list(benchmark?.categories).map((targetCategory) => {
    const item = map.get(targetCategory.key);
    const kind = evidenceKind(item);
    const score = item?.score ?? 0;
    return {
      key: targetCategory.key, label: targetCategory.label || CATEGORY_LABELS[targetCategory.key] || targetCategory.key,
      position: labelState(score), evidenceKind: kind, evidenceConfidence: confidenceFor(kind),
      evidence: list(item?.sources).map((source) => ({ source: source.source, detail: source.evidence || null })),
      limitation: kind === "unknown" ? "Newbert does not have evidence for this area yet." : kind === "self_reported" ? "Listed in your profile but not yet supported by connected or project evidence." : null,
    };
  });
  return { categories, sourceSummary: evidence, generatedAt: new Date() };
}

function seniorSupportFor(categoryKey, alumni = []) {
  const real = list(alumni).filter((item) => item.verified && !item.isDummyData);
  if (!real.length) return { level: "none", count: 0, cohort: 0 };
  const count = real.filter((senior) => {
    const values = [...list(senior.skills), ...list(senior.csFundamentals), ...list(senior.placementPreparation?.development?.skills), ...list(senior.placementPreparation?.csFundamentals?.subjects)];
    return values.some((value) => categoryFor({ skill: normalizeSkill(value) }) === categoryKey);
  }).length;
  return { level: count >= 2 && count / real.length >= 0.5 ? "common" : count ? "present" : "none", count, cohort: real.length };
}

function gapTypeFor(target, current) {
  if (["low"].includes(target.importance)) return "optional";
  if (["unknown", "self_reported"].includes(current.evidenceKind)) return target.importance === "critical" || target.importance === "high" ? "target_gap" : "evidence_gap";
  if (["unknown", "weak_evidence"].includes(current.position)) return target.importance === "critical" || target.importance === "high" ? "target_gap" : "knowledge_gap";
  if (current.position === "developing" && target.importance === "critical") return "knowledge_gap";
  return "ready";
}

function buildPreparationGaps({ benchmark, currentPosition, alumni = [] }) {
  const currentByKey = new Map(list(currentPosition?.categories).map((item) => [item.key, item]));
  return list(benchmark?.categories).map((target) => {
    const current = currentByKey.get(target.key) || { key: target.key, label: target.label, position: "unknown", evidenceKind: "unknown", evidenceConfidence: "low", evidence: [] };
    const gapType = gapTypeFor(target, current);
    const seniorSupport = seniorSupportFor(target.key, alumni);
    const score = gapType === "ready" || gapType === "optional" ? 0
      : (TARGET_IMPORTANCE_POINTS[target.importance] || 0) + (GAP_POINTS[gapType] || 0)
        + (EVIDENCE_CONFIDENCE_POINTS[target.confidence] || 0) + (SENIOR_SUPPORT_POINTS[seniorSupport.level] || 0);
    const priority = score >= PRIORITY_BANDS.high ? "high" : score >= PRIORITY_BANDS.medium ? "medium" : "low";
    const rootGapType = gapType === "target_gap" ? (["unknown", "self_reported"].includes(current.evidenceKind) ? "evidence_gap" : "knowledge_gap") : gapType;
    return {
      id: `gap-${target.key}`, categoryKey: target.key, label: target.label, importance: target.importance,
      classification: target.importance === "low" ? "optional" : target.importance === "medium" ? "recommended" : "required",
      gapType, rootGapType, priority, priorityScore: score, current, target,
      seniorSupport,
      reason: gapType === "ready" ? "Your current evidence is sufficient for this benchmark category."
        : gapType === "optional" ? "This is not a current priority for the selected target."
          : gapType === "evidence_gap" || rootGapType === "evidence_gap" ? "The target values this area, but Newbert cannot verify enough current evidence."
            : "Current demonstrated evidence is below the qualitative target expectation.",
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore || a.label.localeCompare(b.label));
}

const PHASE_BY_CATEGORY = Object.freeze({
  dbms: "foundations", oop: "foundations", operatingSystems: "foundations", computerNetworks: "foundations", csFundamentals: "foundations",
  dsa: "targeted-dsa", programming: "targeted-dsa", projects: "development-evidence", development: "development-evidence",
  frontend: "development-evidence", backend: "development-evidence", cloud: "development-evidence", devops: "development-evidence",
  systemDesign: "project-interview", communication: "project-interview", interviewPreparation: "target-simulation", aptitude: "target-simulation",
  engineeringMathematics: "gate-foundations", coreSubjects: "gate-foundations", pyq: "gate-practice", mockTests: "gate-mocks", revision: "gate-revision",
});
const PHASES = Object.freeze([
  ["foundations", "Close interview foundations"], ["targeted-dsa", "Targeted problem solving"],
  ["development-evidence", "Development evidence"], ["project-interview", "Project interview preparation"],
  ["target-simulation", "Target simulation"],
  ["gate-foundations", "GATE foundations"], ["gate-practice", "PYQ practice"],
  ["gate-mocks", "Mock-test practice"], ["gate-revision", "Revision strategy"],
]);
function milestoneId(gap) { return `milestone-${crypto.createHash("sha1").update(gap.categoryKey).digest("hex").slice(0, 10)}`; }
function completionRule(gap) {
  if (gap.rootGapType === "evidence_gap") return "Done when you add reviewable evidence from a connected account, structured project, or relevant assessment.";
  if (gap.categoryKey === "projects") return "Done when one relevant project has a repository or deployment plus a clear problem, implementation, and result.";
  if (gap.categoryKey === "dsa") return "Done when focused accepted-solution evidence is recorded and you can explain the selected patterns. No fixed count is assumed.";
  return "Done when you can demonstrate the fundamentals through reviewable work or a relevant assessment. Newbert does not currently enforce a numeric threshold.";
}
function effortFor(gap) { return gap.priority === "high" ? "6-10 focused hours" : gap.priority === "medium" ? "3-6 focused hours" : "1-3 focused hours"; }

function buildMilestoneStrategy({ gaps, existingMilestones = [] }) {
  const previous = new Map(list(existingMilestones).map((item) => [item.id, item.toObject ? item.toObject() : item]));
  const actionable = list(gaps).filter((gap) => !["ready", "optional"].includes(gap.gapType)).slice(0, 10);
  const milestones = actionable.map((gap) => {
    const id = milestoneId(gap); const old = previous.get(id) || {};
    return {
      id, phaseId: PHASE_BY_CATEGORY[gap.categoryKey] || "development-evidence", title: gap.label,
      what: `Strengthen ${gap.label} for the selected target.`, why: gap.reason,
      currentState: gap.current.position, targetState: gap.target.importance,
      whatRemains: gap.rootGapType === "evidence_gap" ? "Provide trustworthy evidence before Newbert assumes a knowledge weakness." : "Build and demonstrate the target-relevant fundamentals.",
      doneWhen: completionRule(gap), estimatedEffort: effortFor(gap), priority: gap.priority,
      classification: gap.classification, gapType: gap.gapType, evidence: gap.target.evidence || [],
      status: ["not_started", "in_progress", "completed", "skipped"].includes(old.status) ? old.status : "not_started",
      completedAt: old.completedAt || null,
    };
  });
  const activeIds = new Set(milestones.map((item) => item.id));
  const history = list(existingMilestones).filter((item) => !activeIds.has(item.id) && ["completed", "skipped"].includes(item.status)).map((item) => ({ ...(item.toObject ? item.toObject() : item), archived: true }));
  const phases = PHASES.map(([id, title], index) => {
    const items = milestones.filter((milestone) => milestone.phaseId === id);
    return items.length ? { id, title, order: index + 1, milestoneIds: items.map((item) => item.id), goals: items.map((item) => item.title) } : null;
  }).filter(Boolean);
  return { phases, milestones: [...milestones, ...history] };
}

function overallReadiness(currentPosition) {
  const known = list(currentPosition?.categories).filter((item) => item.evidenceKind !== "unknown");
  if (!known.length) return "insufficient_evidence";
  const strong = known.filter((item) => item.position === "strong").length;
  const weak = known.filter((item) => ["weak_evidence", "unknown"].includes(item.position)).length;
  if (strong === known.length) return "target_ready";
  if (strong >= Math.ceil(known.length * 0.6) && weak === 0) return "near_target";
  return strong ? "building" : "early";
}

module.exports = { buildCurrentPosition, buildMilestoneStrategy, buildPreparationGaps, overallReadiness };
