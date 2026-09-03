import API from "./api";

export async function getNextUnlocks() {
  const { data } = await API.get("/improvement-plans/next-unlocks");
  return data.unlocks || [];
}

export async function previewImprovementPlan(skill) {
  const { data } = await API.post("/improvement-plans/preview", { skill });
  return data;
}

export async function addImprovementPlan(skill) {
  const { data } = await API.post("/improvement-plans", { skill });
  return data;
}

export async function updateImprovementTask(planId, taskId, completed) {
  const { data } = await API.patch(`/improvement-plans/${planId}/tasks/${taskId}`, { completed });
  return data.plan;
}

export async function submitImprovementEvidence(planId, evidence) {
  const { data } = await API.post(`/improvement-plans/${planId}/evidence`, evidence);
  return data;
}
