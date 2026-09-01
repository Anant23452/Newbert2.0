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

export async function refreshProjectAnalysis(projectId) {
  const { data } = await API.post(`/projects/${projectId}/refresh`);
  return data;
}

export async function deleteProject(projectId) {
  const { data } = await API.delete(`/projects/${projectId}`);
  return data;
}
