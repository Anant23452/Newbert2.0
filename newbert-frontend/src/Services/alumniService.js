import API from "./api";

export async function getRecommendedAlumni(sort = "relevant") { const { data } = await API.get(`/alumni/recommended?sort=${sort}`); return data; }
export async function getPublicAlumni() { const { data } = await API.get("/alumni"); return data; }
export async function getClosestAlumni(limit = 3) { const { data } = await API.get(`/alumni/closest?limit=${limit}`); return data; }
export async function getAlumniBenchmark() { const { data } = await API.get("/alumni/benchmark"); return data; }
export async function compareWithAlumni(id, path) { const { data } = await API.get(`/alumni/${id}/compare`, { params: path ? { path } : undefined }); return { ...data.comparison, evidenceComparison: data.evidenceComparison || null }; }
export async function addAlumniPathToRoadmap(id, path) { const { data } = await API.post(`/alumni/${id}/roadmap-signal`, { path }); return data; }
export async function createMentorshipRequest(payload) { const { data } = await API.post("/mentorship/requests", payload); return data; }
export async function getMyMentorshipRequests() { const { data } = await API.get("/mentorship/requests/mine"); return data; }
export async function getReceivedMentorshipRequests() { const { data } = await API.get("/mentorship/requests/received"); return data; }
export async function respondToMentorshipRequest(id, payload) { const { data } = await API.patch(`/mentorship/requests/${id}/respond`, payload); return data; }
export async function cancelMentorshipRequest(id) { const { data } = await API.patch(`/mentorship/requests/${id}/cancel`); return data; }
