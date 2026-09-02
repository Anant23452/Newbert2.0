import API from "./api";

export async function getGithubRepositories() {
  const { data } = await API.get("/projects/github/repos");
  return data;
}

export async function analyzeGithubRepository(payload) {
  const { data } = await API.post("/projects/github/analyze", payload);
  return data.analysis;
}

export async function addGithubProject(payload) {
  const { data } = await API.post("/projects/github/add", payload);
  return data;
}

export async function toggleFeaturedProject(projectId) {
  const { data } = await API.patch(`/projects/${projectId}/featured`);
  return data;
}

export async function updateProjectVisibility(projectId, visibility) {
  const { data } = await API.patch(`/projects/${projectId}/visibility`, { visibility });
  return data;
}

export async function refreshProjectAnalysis(projectId) {
  const { data } = await API.post(`/projects/${projectId}/refresh`);
  return data;
}

export async function confirmProjectTechnologies(projectId, technologies) {
  const { data } = await API.post(`/projects/${projectId}/confirm-technologies`, { technologies });
  return data;
}

export async function getEffectiveSkills() {
  const { data } = await API.get("/profiles/skills/effective");
  return data;
}

export async function getSkillEvidence(skill) {
  const { data } = await API.get(`/profiles/skills/${encodeURIComponent(skill)}/evidence`);
  return data;
}

export async function deleteProject(projectId) {
  const { data } = await API.delete(`/projects/${projectId}`);
  return data;
}
