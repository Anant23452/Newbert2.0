import API from "./api";

export async function getMyPlan() {
  const { data } = await API.get("/plans/me");
  return data.plan;
}

export async function generatePlan(target, confirmReplace = false) {
  const { data } = await API.post("/plans/generate", { target, confirmReplace });
  return data.plan;
}

export async function previewPlanContext(target) {
  const { data } = await API.post("/plans/preview", { target });
  return data.preview;
}

export async function recalculatePlan() {
  const { data } = await API.post("/plans/recalculate");
  return data.plan;
}

export async function getRoadmapTargetJobs() {
  const { data } = await API.get("/plans/target-jobs");
  return data.jobs || [];
}

export async function setPlanTaskStatus(taskId, status) {
  const { data } = await API.patch(`/plans/tasks/${taskId}`, { status });
  return data.plan;
}

export async function setPlanTaskCompleted(taskId, completed) {
  const { data } = await API.patch(`/plans/tasks/${taskId}`, { completed });
  return data.plan;
}

export async function getPlanExplanation() {
  const { data } = await API.post("/ai/plan-explanation");
  return data.explanation;
}
