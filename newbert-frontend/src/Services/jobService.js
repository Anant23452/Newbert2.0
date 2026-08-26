import API from "./api";

export async function listVerifiedJobs(params = {}) { const { data } = await API.get("/jobs", { params }); return data.jobs; }
export async function getRecommendedJobs(params = {}) { const { data } = await API.get("/jobs/recommended", { params }); return data; }
export async function getJobAnalysis(id) { const { data } = await API.get(`/jobs/${id}/analysis`); return data; }
export async function saveJobForUser(id) { const { data } = await API.post(`/jobs/${id}/save`); return data.saved; }
export async function unsaveJobForUser(id) { await API.delete(`/jobs/${id}/save`); }
export async function updateSavedJobStatus(id, status) { const { data } = await API.patch(`/jobs/${id}/save`, { status }); return data.saved; }
