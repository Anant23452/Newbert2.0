function nextBestAction(tasks = []) {
  const actionable = tasks.filter((task) => !task.archived && !["completed", "skipped"].includes(task.status));
  actionable.sort((left, right) => right.priorityScore - left.priorityScore || (left.status === "in_progress" ? -1 : right.status === "in_progress" ? 1 : 0) || left.title.localeCompare(right.title));
  const task = actionable[0];
  if (!task) return null;
  return { taskId: task.id, action: task.title, category: task.category, priority: task.priority, priorityScore: task.priorityScore, status: task.status, why: task.reasons, evidence: task.evidence, relatedGapIds: task.gapIds, relatedJobs: task.relatedJobs };
}

module.exports = { nextBestAction };
