const test = require("node:test");
const assert = require("node:assert/strict");

const Alumni = require("../Models/Alumni");
const College = require("../Models/College");
const Profile = require("../Models/Profile");
const rajkiyaColleges = require("../data/upRajkiyaEngineeringColleges");
const {
  normalizeCollegeName,
  rankCollege,
  sameCollegeQuery,
  searchColleges,
} = require("../services/collegeService");

test("normalization removes punctuation and collapses spacing without losing the city", () => {
  assert.equal(
    normalizeCollegeName(" Rajkiya  Engineering College, Banda "),
    "rajkiya engineering college banda",
  );
});

test("maintained Rajkiya seed contains seven unique active colleges", () => {
  assert.equal(rajkiyaColleges.length, 7);
  assert.equal(new Set(rajkiyaColleges.map((college) => college.collegeId)).size, 7);
  assert.ok(rajkiyaColleges.every((college) => college.isActive && college.stateCode === "UP"));
  assert.ok(rajkiyaColleges.some((college) => college.aliases.includes("REC AmbedkarNagar")));
});

test("search ranking prefers exact alias and useful contains matches", async () => {
  const originalFind = College.find;
  College.find = () => ({
    limit: () => ({ lean: async () => rajkiyaColleges }),
  });

  try {
    assert.equal((await searchColleges("REC Banda"))[0].collegeId, "rec-banda");
    assert.equal((await searchColleges("son"))[0].collegeId, "rec-sonbhadra");
    assert.equal((await searchColleges("REC Ambedkar Nagar"))[0].collegeId, "rec-ambedkar-nagar");
    assert.equal((await searchColleges("raj"))[0].name, "Rajkiya Engineering College, Ambedkar Nagar");
  } finally {
    College.find = originalFind;
  }
});

test("Profile and Alumni reference the same College model while retaining legacy names", () => {
  assert.equal(Profile.schema.path("collegeRef").options.ref, "College");
  assert.equal(Alumni.schema.path("collegeRef").options.ref, "College");
  assert.equal(Profile.schema.path("college").instance, "String");
  assert.equal(Alumni.schema.path("college").instance, "String");
});

test("same-college query prefers canonical identity and keeps an exact legacy fallback", () => {
  const query = sameCollegeQuery({
    collegeRef: "507f1f77bcf86cd799439011",
    collegeId: "rec-banda",
    college: "Rajkiya Engineering College, Banda",
  });

  assert.equal(query.$or[0].collegeRef, "507f1f77bcf86cd799439011");
  assert.equal(query.$or[1].collegeId, "rec-banda");
  assert.equal(query.$or[2].college.$options, "i");
});

test("strong exact college identities outrank prefixes and contains matches", () => {
  const college = rajkiyaColleges.find((item) => item.collegeId === "rec-banda");
  assert.ok(rankCollege(college, "REC Banda") > rankCollege(college, "REC"));
  assert.ok(rankCollege(college, "REC") > rankCollege(college, "Banda"));
});
