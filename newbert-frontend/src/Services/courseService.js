import API from "./api";
export async function listCourses(params = {}) { const { data } = await API.get("/courses", { params }); return data; }
export async function getCourse(id) { const { data } = await API.get(`/courses/${id}`); return data; }
export async function saveCourseReview(id, review) { const { data } = await API.put(`/courses/${id}/review`, review); return data; }
export async function addCourseToPlan(id) { const { data } = await API.post(`/courses/${id}/add-to-plan`); return data; }
export async function listAdminCourses() { const { data } = await API.get("/admin/courses"); return data.courses; }
export async function createAdminCourse(payload) { const { data } = await API.post("/admin/courses", payload); return data.course; }
export async function analyzeAdminCourse(rawText) { const { data } = await API.post("/admin/courses/analyze", { rawText }); return data.draft; }
