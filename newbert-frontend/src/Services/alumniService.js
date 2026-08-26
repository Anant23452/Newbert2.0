import API from "./api";

export async function getRecommendedAlumni(sort = "relevant") { const { data } = await API.get(`/alumni/recommended?sort=${sort}`); return data; }
export async function getClosestAlumni(limit = 3) { const { data } = await API.get(`/alumni/closest?limit=${limit}`); return data; }
export async function getAlumniBenchmark() { const { data } = await API.get("/alumni/benchmark"); return data; }
export async function compareWithAlumni(id) { const { data } = await API.get(`/alumni/${id}/compare`); return data.comparison; }
