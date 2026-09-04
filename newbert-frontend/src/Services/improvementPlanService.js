import API from "./api";

export async function getNextUnlocks() {
  const { data } = await API.get("/improvement-plans/next-unlocks");
  const list = data.unlocks || [];
  list.status = data.status || (list.length ? "ready" : "empty");
  list.missing = data.missing || [];
  list.readiness = data.readiness || null;
  return list;
}

export async function previewImprovementPlan(skillId) {
  const { data } = await API.post("/improvement-plans/preview", { skillId, skill: skillId });
  return data;
}

export async function addImprovementPlan(skillId) {
  const { data } = await API.post("/improvement-plans", { skillId, skill: skillId });
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
