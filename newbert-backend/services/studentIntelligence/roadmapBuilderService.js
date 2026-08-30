const crypto = require("crypto");

const PHASES = Object.freeze([
  { id: "foundations", title: "Foundations", order: 1 },
  { id: "core-skills", title: "Core Skills", order: 2 },
  { id: "dsa-interview", title: "DSA / Interview Preparation", order: 3 },
  { id: "project-evidence", title: "Project / Engineering Evidence", order: 4 },
  { id: "application-readiness", title: "Application Readiness", order: 5 },
]);

function stableTaskId(gap) { return `task-${crypto.createHash("sha1").update(`${gap.category}:${gap.canonicalSkill}`).digest("hex").slice(0, 12)}`; }
function oldStatus(task) { if (["not_started", "in_progress", "completed", "skipped"].includes(task?.status)) return task.status; return task?.completed ? "completed" : "not_started"; }
function taskTitle(gap, normalizedProfile) {
  if (gap.category === "project-evidence") return normalizedProfile.projects.count > 0 ? "Strengthen and document one existing project" : "Build and document one target-relevant project";
  if (gap.category === "dsa-interview") return `Practice and record evidence for ${gap.item}`;
  if (gap.category === "application-readiness") return "Complete a realistic weekly evidence-building routine";
  if (normalizedProfile.projects.count > 0 && gap.category === "core-skills") return `Learn and apply ${gap.item} in an existing project`;
  return `Learn and apply ${gap.item}`;
}

function buildRoadmapStructure({ prioritizedGaps, normalizedProfile, existingTasks = [] }) {
  const previous = new Map(existingTasks.map((task) => [task.id, task.toObject ? task.toObject() : task]));
  const tasks = prioritizedGaps.slice(0, 15).map((gap, index) => {
    const id = stableTaskId(gap); const old = previous.get(id); const status = oldStatus(old);
    return { id, title: taskTitle(gap, normalizedProfile), description: gap.reasons[0] || "This task follows the current deterministic priority order.", type: index < 4 ? "daily" : "weekly", phaseId: gap.category, category: gap.category, scheduledWeek: Math.floor(index / 3) + 1, scheduledDate: null, priority: gap.priority, priorityScore: gap.priorityScore, reasons: gap.reasons, reasonCodes: gap.reasonCodes, evidence: gap.evidence, gapIds: gap.gapIds, relatedJobs: gap.relatedJobs, verifiable: gap.evidence.some((item) => item.supported), status, completed: status === "completed", completedAt: status === "completed" ? old?.completedAt || new Date() : null, skippedAt: status === "skipped" ? old?.skippedAt || new Date() : null, archived: false };
  });
  const activeIds = new Set(tasks.map((task) => task.id));
  const history = existingTasks.filter((task) => !activeIds.has(task.id) && ["completed", "skipped"].includes(oldStatus(task))).map((task) => ({ ...(task.toObject ? task.toObject() : task), status: oldStatus(task), completed: oldStatus(task) === "completed", archived: true }));
  const activePhaseIds = new Set(tasks.map((task) => task.phaseId));
  const phases = PHASES.filter((phase) => activePhaseIds.has(phase.id)).map((phase) => { const phaseTasks = tasks.filter((task) => task.phaseId === phase.id); return { ...phase, startWeek: Math.min(...phaseTasks.map((task) => task.scheduledWeek)), endWeek: Math.max(...phaseTasks.map((task) => task.scheduledWeek)), goals: phaseTasks.map((task) => task.title), taskIds: phaseTasks.map((task) => task.id) }; });
  return { phases, tasks: [...tasks, ...history] };
}

module.exports = { PHASES, buildRoadmapStructure, stableTaskId };
