const test = require("node:test");
const assert = require("node:assert/strict");
const Alumni = require("../Models/Alumni");
const MentorshipBooking = require("../Models/MentorshipBooking");
const { buildComparison } = require("../services/alumniMatchingService");
const { serializePublicAlumni } = require("../services/alumniPublicService");
const { canAlumniTransition, canStudentCancel, statusLabel } = require("../services/mentorshipService");
const { dummyAlumniFixtures } = require("../data/dummyAlumniFixtures");
const { assertDummyAllowed } = require("../scripts/seedDummyAlumni");

const student = { college: "North Valley Institute of Technology", branch: "Computer Science and Engineering", targetRole: "Backend Engineer", projects: 2, skills: [{ name: "Java" }, { name: "DBMS" }], leetcodeStats: { totalSolved: 210 }, githubStats: { publicRepos: 5 } };

test("placement alumni comparison uses submitted DSA and project values", () => {
  const alumni = dummyAlumniFixtures[1];
  const result = buildComparison(student, alumni, { goal: "placement", target: { role: "Backend Engineer" }, requestedPath: "placement" });
  assert.equal(result.path, "placement");
  assert.equal(result.dimensions.find((item) => item.key === "dsa").alumni.value, 320);
  assert.ok(result.differences.some((item) => item.includes("320")));
  assert.match(result.similarity.band, /very_similar|similar|somewhat_similar|limited_comparison/);
});

test("GATE comparison uses only recorded student stage evidence", () => {
  const alumni = dummyAlumniFixtures[3];
  const result = buildComparison(student, alumni, { goal: "gate", requestedPath: "gate", target: { paper: "CS" }, stage: { completed: ["DBMS"], testCount: 4, pyqYears: 5, revisionCycles: 1, preparationMonths: 6 } });
  assert.equal(result.path, "gate");
  assert.equal(result.dimensions.find((item) => item.key === "tests").student.value, 4);
  assert.equal(result.dimensions.find((item) => item.key === "tests").alumni.value, 18);
  assert.ok(result.differences.some((item) => item.includes("18 tests")));
});

test("missing comparison values remain unavailable rather than zero", () => {
  const result = buildComparison({ skills: [] }, { careerPaths: ["gate"], gatePreparation: {}, gateOutcome: {} }, { goal: "gate", requestedPath: "gate", stage: {} });
  const tests = result.dimensions.find((item) => item.key === "tests");
  assert.equal(tests.student.value, null);
  assert.equal(tests.alumni.value, null);
  assert.equal(tests.student.display, "Unavailable");
  assert.equal(result.confidence.level, "low");
});

test("combined dummy alumni exposes both supported paths", () => { assert.deepEqual(dummyAlumniFixtures[5].careerPaths, ["placement", "gate"]); });
test("course reviews retain rating, recommendation, and path", () => { const course = dummyAlumniFixtures[3].courses[0]; assert.equal(course.path, "gate"); assert.equal(course.rating, 4); assert.equal(course.wouldRecommend, true); assert.ok(course.review); });
test("mentorship disabled remains disabled in public serialization", () => { const result = serializePublicAlumni({ mentorshipEnabled: false, availableTopics: ["dsa"] }); assert.equal(result.mentorshipEnabled, false); });
test("new mentorship booking defaults to requested", () => { const booking = new MentorshipBooking({ studentId: "507f1f77bcf86cd799439011", alumniId: "507f191e810c19729de860ea", topicCategory: "dsa", topicDetails: "Please review my current DSA preparation plan.", requestedDateTime: new Date(), durationMinutes: 30 }); assert.equal(booking.status, "requested"); });
test("alumni can accept or reject requested booking", () => { assert.equal(canAlumniTransition("requested", "accepted"), true); assert.equal(canAlumniTransition("requested", "rejected"), true); assert.equal(statusLabel("accepted"), "Accepted"); assert.equal(statusLabel("rejected"), "Rejected"); });
test("unauthorized transitions and terminal cancellation are rejected", () => { assert.equal(canAlumniTransition("rejected", "accepted"), false); assert.equal(canStudentCancel("rejected"), false); assert.equal(canStudentCancel("requested"), true); });
test("all six dummy alumni are fictional marked fixtures and validate", () => { assert.equal(dummyAlumniFixtures.length, 6); for (const fixture of dummyAlumniFixtures) { assert.equal(fixture.isDummyData, true); assert.ok(fixture.dummyKey); assert.equal(new Alumni(fixture).validateSync(), undefined); } });
test("production cannot enable dummy seed", () => { const previousNode = process.env.NODE_ENV; const previousAllow = process.env.ALLOW_DUMMY_ALUMNI; process.env.NODE_ENV = "production"; process.env.ALLOW_DUMMY_ALUMNI = "true"; assert.throws(assertDummyAllowed, /disabled/); process.env.NODE_ENV = previousNode; process.env.ALLOW_DUMMY_ALUMNI = previousAllow; });

