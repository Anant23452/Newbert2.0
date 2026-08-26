import API from "./api";

export async function listVerifiedJobs(params = {}) { const { data } = await API.get("/jobs", { params }); return data.jobs; }
export async function getRecommendedJobs(params = {}) { const { data } = await API.get("/jobs/recommended", { params }); return data; }
export async function getJobAnalysis(id) { const { data } = await API.get(`/jobs/${id}/analysis`); return data; }
export async function saveJobForUser(id) { const { data } = await API.post(`/jobs/${id}/save`); return data.saved; }
export async function unsaveJobForUser(id) { await API.delete(`/jobs/${id}/save`); }
export async function updateSavedJobStatus(id, status) { const { data } = await API.patch(`/jobs/${id}/save`, { status }); return data.saved; }
export async function getAdminJobs() { const { data } = await API.get("/admin/jobs"); return data; }
export async function createAdminJob(payload) { const { data } = await API.post("/admin/jobs", payload); return data.job; }
export async function refreshAdminJob(id) { const { data } = await API.post(`/admin/jobs/${id}/refresh`); return data.job; }
export async function updateAdminJob(id, payload) { const { data } = await API.patch(`/admin/jobs/${id}`, payload); return data.job; }
export async function updateAdminJobStatus(id, status) { const { data } = await API.patch(`/admin/jobs/${id}/status`, { status }); return data.job; }
export async function deleteAdminJob(id) { await API.delete(`/admin/jobs/${id}`); }
