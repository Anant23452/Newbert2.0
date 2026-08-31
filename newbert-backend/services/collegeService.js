const mongoose = require("mongoose");
const College = require("../Models/College");

function normalizeCollegeName(value) { return String(value || "").toLowerCase().trim().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " "); }
const normalizeCollegeText = normalizeCollegeName;
function escapeRegex(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function activeCollegeQuery(extra = {}) { return { ...extra, active: { $ne: false }, isActive: { $ne: false } }; }
function identityValues(college) { return [college.name, college.shortName, ...(college.aliases || [])].map(normalizeCollegeName).filter(Boolean); }

async function findCollegeByIdentifier(value) {
  const id = String(value || "").trim(); if (!id) return null;
  const identity = mongoose.Types.ObjectId.isValid(id) ? { $or: [{ _id: id }, { collegeId: id.toLowerCase() }] } : { collegeId: id.toLowerCase() };
  return College.findOne(activeCollegeQuery(identity)).lean();
}
async function matchCollege(value) {
  const target = normalizeCollegeName(value); if (!target) return { status: "unresolved", college: null, matches: [] };
  const candidates = await searchColleges(value, { limit: 25 });
  const matches = candidates.filter((college) => identityValues(college).includes(target));
  return matches.length === 1 ? { status: "resolved", college: matches[0], matches } : matches.length > 1 ? { status: "ambiguous", college: null, matches } : { status: "unresolved", college: null, matches: [] };
}
async function findCollegeByText(value) { return (await matchCollege(value)).college; }
async function resolveProfileCollege(profile, { persist = false } = {}) {
  if (!profile) return null;
  let college = await findCollegeByIdentifier(profile.collegeRef || profile.collegeId);
  if (!college) college = await findCollegeByText(profile.collegeName || profile.college);
  if (!college) return null;
  if (persist && (String(profile.collegeRef || "") !== String(college._id) || profile.collegeId !== college.collegeId || profile.collegeName !== college.name || profile.college !== college.name)) { const Profile = require("../Models/Profile"); await Profile.updateOne({ _id: profile._id }, { $set: { collegeRef: college._id, collegeId: college.collegeId, collegeName: college.name, college: college.name } }); }
  return college;
}
async function resolveAlumniCollege(alumni, { persist = false } = {}) {
  if (!alumni) return null;
  let college = await findCollegeByIdentifier(alumni.collegeRef || alumni.collegeId);
  if (!college) college = await findCollegeByText(alumni.collegeName || alumni.college);
  if (!college) return null;
  if (persist && (String(alumni.collegeRef || "") !== String(college._id) || alumni.collegeId !== college.collegeId || alumni.collegeName !== college.name || alumni.college !== college.name)) { const Alumni = require("../Models/Alumni"); await Alumni.updateOne({ _id: alumni._id }, { $set: { collegeRef: college._id, collegeId: college.collegeId, collegeName: college.name, college: college.name } }); }
  return college;
}
function sameCollegeQuery(record) {
  const clauses = [];
  if (record?.collegeRef && mongoose.Types.ObjectId.isValid(record.collegeRef)) clauses.push({ collegeRef: record.collegeRef });
  if (record?.collegeId) clauses.push({ collegeId: String(record.collegeId).toLowerCase() });
  const name = String(record?.collegeName || record?.college || "").trim();
  if (name) clauses.push({ college: { $regex: `^${escapeRegex(name)}$`, $options: "i" } });
  if (!clauses.length) return { _id: null };
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}
function rankCollege(college, query) {
  const normalized = normalizeCollegeName(query); const name = normalizeCollegeName(college.name); const short = normalizeCollegeName(college.shortName); const aliases = (college.aliases || []).map(normalizeCollegeName);
  if (college.normalizedName === normalized || name === normalized || short === normalized || aliases.includes(normalized)) return 1000;
  if (name.startsWith(normalized)) return 800; if (short.startsWith(normalized)) return 700; if (aliases.some((alias) => alias.startsWith(normalized))) return 600;
  const terms = normalized.split(" ").filter(Boolean); const haystack = [name, short, normalizeCollegeName(college.city), ...aliases].join(" "); return 100 + terms.filter((term) => haystack.includes(term)).length * 50 + (haystack.includes(normalized) ? 100 : 0);
}
async function searchColleges(query, { state, limit = 10 } = {}) {
  const normalized = normalizeCollegeName(query); if (!normalized) return [];
  const terms = normalized.split(" ").filter(Boolean).slice(0, 8);
  const termQueries = terms.map((term) => { const regex = new RegExp(escapeRegex(term), "i"); return { $or: [{ name: regex }, { shortName: regex }, { normalizedName: regex }, { aliases: regex }, { city: regex }] }; });
  const filters = activeCollegeQuery({ ...(state ? { state: { $regex: `^${escapeRegex(String(state).trim())}$`, $options: "i" } } : {}), ...(termQueries.length ? { $and: termQueries } : {}) });
  const safeLimit = Math.min(25, Math.max(1, Number(limit) || 10));
  const candidates = await College.find(filters).limit(100).lean(); return candidates.sort((a, b) => rankCollege(b, normalized) - rankCollege(a, normalized) || a.name.localeCompare(b.name)).slice(0, safeLimit);
}
function slugCollege(value) { return normalizeCollegeName(value).replace(/\s+/g, "-").slice(0, 90); }
module.exports = { activeCollegeQuery, escapeRegex, findCollegeByIdentifier, findCollegeByText, matchCollege, normalizeCollegeName, normalizeCollegeText, rankCollege, resolveAlumniCollege, resolveProfileCollege, sameCollegeQuery, searchColleges, slugCollege };
