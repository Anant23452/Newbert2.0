const mongoose = require("mongoose");
const College = require("../Models/College");

function normalizeCollegeName(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[()[\]{},.\/\\_-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const normalizeCollegeText = normalizeCollegeName;

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function activeCollegeQuery(extra = {}) {
  return { ...extra, active: { $ne: false }, isActive: { $ne: false } };
}

function searchableValues(college) {
  return [
    college.name,
    college.shortName,
    college.abbreviation,
    college.city,
    college.district,
    college.university,
    ...(college.aliases || []),
  ].map(normalizeCollegeName).filter(Boolean);
}

function identityValues(college) {
  return [college.name, college.shortName, college.abbreviation, ...(college.aliases || [])]
    .map(normalizeCollegeName)
    .filter(Boolean);
}

function meaningfulTokens(value) {
  const normalized = normalizeCollegeName(value);
  const tokens = normalized.split(" ").filter(Boolean);
  return tokens.length === 1 ? tokens : tokens.filter((token) => token.length > 1);
}

function tokenMatches(queryToken, collegeToken) {
  return collegeToken.startsWith(queryToken)
    || (collegeToken.length >= 3 && queryToken.startsWith(collegeToken));
}

function collegeTokenCoverage(college, query) {
  const queryTokens = meaningfulTokens(query);
  if (!queryTokens.length) return { coverage: 0, matched: 0, total: 0 };
  const collegeTokens = searchableValues(college).flatMap((value) => value.split(" "));
  const matched = queryTokens.filter((queryToken) => collegeTokens.some((collegeToken) => tokenMatches(queryToken, collegeToken))).length;
  return { coverage: matched / queryTokens.length, matched, total: queryTokens.length };
}

async function findCollegeByIdentifier(value) {
  const id = String(value || "").trim();
  if (!id) return null;
  const identity = mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ _id: id }, { collegeId: id.toLowerCase() }] }
    : { collegeId: id.toLowerCase() };
  return College.findOne(activeCollegeQuery(identity)).lean();
}

async function matchCollege(value) {
  const target = normalizeCollegeName(value);
  if (!target) return { status: "unresolved", college: null, matches: [] };
  const candidates = await searchColleges(value, { limit: 25 });
  const matches = candidates.filter((college) => identityValues(college).includes(target));
  if (matches.length === 1) return { status: "resolved", college: matches[0], matches };
  if (matches.length > 1) return { status: "ambiguous", college: null, matches };
  return { status: "unresolved", college: null, matches: [] };
}

async function findCollegeByText(value) {
  return (await matchCollege(value)).college;
}

async function resolveProfileCollege(profile, { persist = false } = {}) {
  if (!profile) return null;
  let college = await findCollegeByIdentifier(profile.collegeRef || profile.collegeId);
  if (!college) college = await findCollegeByText(profile.collegeName || profile.college);
  if (!college) return null;

  const changed = String(profile.collegeRef || "") !== String(college._id)
    || profile.collegeId !== college.collegeId
    || profile.collegeName !== college.name
    || profile.college !== college.name;
  if (persist && changed) {
    const Profile = require("../Models/Profile");
    await Profile.updateOne(
      { _id: profile._id },
      { $set: { collegeRef: college._id, collegeId: college.collegeId, collegeName: college.name, college: college.name } },
    );
  }
  return college;
}

async function resolveAlumniCollege(alumni, { persist = false } = {}) {
  if (!alumni) return null;
  let college = await findCollegeByIdentifier(alumni.collegeRef || alumni.collegeId);
  if (!college) college = await findCollegeByText(alumni.collegeName || alumni.college);
  if (!college) return null;

  const changed = String(alumni.collegeRef || "") !== String(college._id)
    || alumni.collegeId !== college.collegeId
    || alumni.collegeName !== college.name
    || alumni.college !== college.name;
  if (persist && changed) {
    const Alumni = require("../Models/Alumni");
    await Alumni.updateOne(
      { _id: alumni._id },
      { $set: { collegeRef: college._id, collegeId: college.collegeId, collegeName: college.name, college: college.name } },
    );
  }
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
  const normalized = normalizeCollegeName(query);
  const name = normalizeCollegeName(college.name);
  const shortName = normalizeCollegeName(college.shortName);
  const abbreviation = normalizeCollegeName(college.abbreviation);
  const city = normalizeCollegeName(college.city);
  const aliases = (college.aliases || []).map(normalizeCollegeName);
  const values = searchableValues(college);
  const tokenScore = collegeTokenCoverage(college, normalized);

  let score = tokenScore.coverage * 400 + tokenScore.matched * 15;
  if (name === normalized) score += 1000;
  else if (shortName === normalized || aliases.includes(normalized)) score += 920;
  else if (abbreviation === normalized) score += 900;
  if (name.startsWith(normalized)) score += 800;
  if (shortName.startsWith(normalized)) score += 760;
  if (aliases.some((alias) => alias.startsWith(normalized))) score += 720;
  if (city === normalized) score += 650;
  if (values.some((value) => value.includes(normalized))) score += 500;
  if (tokenScore.coverage === 1 && tokenScore.total > 1) score += 600;
  return score;
}

function isRelevantCollege(college, query) {
  const normalized = normalizeCollegeName(query);
  const values = searchableValues(college);
  if (values.some((value) => value.includes(normalized))) return true;
  const { coverage, total } = collegeTokenCoverage(college, normalized);
  if (coverage === 1) return true;
  return total >= 3 && coverage >= 0.66;
}

async function searchColleges(query, { state, limit = 10 } = {}) {
  const normalized = normalizeCollegeName(query);
  if (!normalized) return [];

  const queryTokens = meaningfulTokens(normalized).slice(0, 10);
  const fields = ["name", "shortName", "abbreviation", "normalizedName", "aliases", "city", "district", "university"];
  const searchClauses = queryTokens.flatMap((token) => {
    const regex = new RegExp(escapeRegex(token), "i");
    return fields.map((field) => ({ [field]: regex }));
  });
  const filters = activeCollegeQuery({
    ...(state ? { state: { $regex: `^${escapeRegex(String(state).trim())}$`, $options: "i" } } : {}),
    $or: searchClauses,
  });
  const safeLimit = Math.min(25, Math.max(1, Number(limit) || 10));
  const candidates = await College.find(filters).limit(250).lean();

  return candidates
    .filter((college) => isRelevantCollege(college, normalized))
    .sort((a, b) => rankCollege(b, normalized) - rankCollege(a, normalized) || a.name.localeCompare(b.name))
    .slice(0, safeLimit);
}

function slugCollege(value) {
  return normalizeCollegeName(value).replace(/\s+/g, "-").slice(0, 90);
}

module.exports = {
  activeCollegeQuery,
  collegeTokenCoverage,
  escapeRegex,
  findCollegeByIdentifier,
  findCollegeByText,
  matchCollege,
  normalizeCollegeName,
  normalizeCollegeText,
  rankCollege,
  resolveAlumniCollege,
  resolveProfileCollege,
  sameCollegeQuery,
  searchColleges,
  slugCollege,
};
