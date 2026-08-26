const colleges = [{ id: "rec-ambedkar-nagar", name: "Rajkiya Engineering College, Ambedkar Nagar", shortName: "REC Ambedkar Nagar", university: "AKTU", city: "Ambedkar Nagar", state: "Uttar Pradesh", aliases: ["rec ambedkar nagar", "rajkiya engineering college ambedkar nagar", "rajkiya eng college ambedkar nagar", "rec ambedkarnagar"] }];
const normalizeCollegeName = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const matchCollege = (value) => colleges.find((college) => [college.name, college.shortName, ...college.aliases].some((name) => normalizeCollegeName(name) === normalizeCollegeName(value))) || null;
const searchColleges = (value) => { const q = normalizeCollegeName(value); return q.length < 2 ? [] : colleges.filter((college) => normalizeCollegeName([college.name, college.shortName, ...college.aliases].join(" ")).includes(q)); };
const getCollege = (id) => colleges.find((college) => college.id === id) || null;
module.exports = { colleges, normalizeCollegeName, matchCollege, searchColleges, getCollege };
