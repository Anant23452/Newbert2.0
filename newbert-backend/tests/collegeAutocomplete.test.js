const test = require("node:test");
const assert = require("node:assert/strict");

const Alumni = require("../Models/Alumni");
const College = require("../Models/College");
const Profile = require("../Models/Profile");
const collegeSeedData = require("../data/collegeSeedData");
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

test("maintained Rajkiya seed contains eight unique active colleges including Mirzapur", () => {
  assert.equal(rajkiyaColleges.length, 8);
  assert.equal(new Set(rajkiyaColleges.map((college) => college.collegeId)).size, 8);
  assert.ok(rajkiyaColleges.every((college) => college.isActive && college.stateCode === "UP"));
  assert.ok(rajkiyaColleges.some((college) => college.aliases.includes("REC AmbedkarNagar")));
  assert.ok(rajkiyaColleges.some((college) => college.collegeId === "rec-mirzapur"));
});

test("search handles prefixes, abbreviations, cities, and punctuation-heavy aliases", async () => {
  const originalFind = College.find;
  College.find = () => ({
    limit: () => ({ lean: async () => collegeSeedData }),
  });

  try {
    const cases = [
      ["r", "rec-ambedkar-nagar"],
      ["ra", "rec-ambedkar-nagar"],
      ["raj", "rec-ambedkar-nagar"],
      ["rajkiya", "rec-ambedkar-nagar"],
      ["rajkiya engineering", "rec-ambedkar-nagar"],
      ["rec", "rec-ambedkar-nagar"],
      ["REC", "rec-ambedkar-nagar"],
      ["rec ambedkar", "rec-ambedkar-nagar"],
      ["ambedkar", "rec-ambedkar-nagar"],
      ["ambedkar nagar", "rec-ambedkar-nagar"],
      ["Rajkiya Engineering College, (REC), Ambedkar Nagar", "rec-ambedkar-nagar"],
      ["banda", "rec-banda"],
      ["rec banda", "rec-banda"],
      ["biet", "biet-jhansi"],
      ["knit", "knit-sultanpur"],
      ["iet lucknow", "iet-lucknow"],
    ];
    for (const [query, expectedId] of cases) {
      assert.equal((await searchColleges(query))[0]?.collegeId, expectedId, query);
    }
    assert.deepEqual(await searchColleges(""), []);
    assert.deepEqual(await searchColleges("   "), []);
    assert.deepEqual(await searchColleges("definitely unknown college"), []);
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
