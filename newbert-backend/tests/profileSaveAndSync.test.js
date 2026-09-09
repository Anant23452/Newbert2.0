const { test, mock } = require("node:test");
const assert = require("node:assert/strict");
const Profile = require("../Models/Profile");
const User = require("../Models/User");
const colleges = require("../services/collegeService");
const github = require("../services/githubService");
const leetcode = require("../services/leetcodeService");
const { getKolkataToday } = require("../utils/dateNormalization");
let current, failGithub = false, failLeetcode = false;
const user = { _id: "507f1f77bcf86cd799439011", name: "Test Student", email: "test@example.invalid" };
const college = { _id: "507f1f77bcf86cd799439012", collegeId: "test-college", name: "Test College" };
function fresh() {
  return { userId: user._id, collegeRef: college._id, collegeId: college.collegeId, college: college.name,
    branch: "Information Technology", graduationYear: 2027, targetRole: "Backend Developer", bio: "Keep this bio",
    githubUsername: "owner", githubUrl: "https://github.com/owner", leetcodeUsername: "owner", leetcodeUrl: "https://leetcode.com/u/owner",
    skills: [], activityCalendar: [], evidenceCache: {}, updatedAt: new Date(),
    toObject() { return { ...this }; }, async save() { return this; },
  };
}
mock.method(Profile, "findOne", async () => current);
mock.method(Profile, "findOneAndUpdate", async (query, update) => { Object.assign(current, update.$set); current.updatedAt = new Date(); return current; });
mock.method(User, "findById", async () => user);
mock.method(User, "findByIdAndUpdate", async () => user);
mock.method(colleges, "findCollegeByIdentifier", async (id) => { assert.equal(typeof id, "string"); return college; });
mock.method(github, "getGithubActivity", async (username) => {
  if (failGithub) throw new Error("GitHub unavailable");
  return { username, languageCounts: {}, repositories: [], activity: [{ date: getKolkataToday(), count: 2, commits: 2 }] };
});
mock.method(leetcode, "getLeetcodeStats", async (username) => {
  if (failLeetcode) throw new Error("LeetCode unavailable");
  return { username, totalSolved: 5, languageCounts: {}, activity: [] };
});
const controller = require("../Controllers/profileController");
async function call(handler, body) {
  const res = { code: 200, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
  await handler({ auth: { id: user._id }, body }, res, (error) => { throw error; });
  return res;
}
test("partial profile edits preserve canonical college, connected accounts and unrelated fields", async () => {
  current = fresh();
  const result = await call(controller.updateMyProfile, { bio: "Updated bio" });
  assert.equal(result.code, 200);
  assert.equal(result.body.githubUsername, "owner");
  assert.equal(result.body.leetcodeUsername, "owner");
  assert.equal(result.body.graduationYear, 2027);
  assert.equal(result.body.collegeId, "test-college");
  assert.equal(result.body.bio, "Updated bio");
});
test("profile endpoint ignores forged integration skill sources and scores", async () => {
  current = fresh();
  const result = await call(controller.updateMyProfile, { skills: [{ name: "SQL", source: "github", score: 100 }] });
  assert.equal(result.body.skills[0].source, "manual");
  assert.equal(result.body.skills[0].score, 0);
});
test("partial sync keeps successful GitHub data and reports failed LeetCode, then enforces cooldown", async () => {
  current = fresh(); failGithub = false; failLeetcode = true;
  const result = await call(controller.syncPublicProfiles, { providers: ["github", "leetcode"] });
  assert.equal(result.code, 200);
  assert.equal(result.body.profile.githubStats.username, "owner");
  assert.equal(result.body.syncErrors.leetcode, "LeetCode unavailable");
  assert.equal(result.body.profile.bio, "Keep this bio");
  const again = await call(controller.syncPublicProfiles, { providers: ["leetcode"] });
  assert.equal(again.code, 429);
});
test("two provider failures leave the saved profile usable with explicit errors", async () => {
  current = fresh(); failGithub = true; failLeetcode = true;
  const result = await call(controller.syncPublicProfiles, {});
  assert.equal(result.code, 200);
  assert.equal(result.body.profile.onboardingCompleted, true);
  assert.equal(result.body.profile.githubStats, null);
  assert.match(result.body.syncErrors.github, /unavailable/);
});
test("switching GitHub accounts never copies historical activity from the previous owner", async () => {
  current = fresh(); failGithub = false; failLeetcode = false;
  current.githubStats = { username: "owner", repositories: [] };
  current.activityCalendar = [{ date: "2026-01-01", github: 90, githubCommits: 90, total: 90 }];
  const result = await call(controller.syncPublicProfiles, { githubUsername: "new-owner", providers: ["github"] });
  assert.equal(result.code, 200);
  assert.equal(result.body.profile.githubUsername, "new-owner");
  assert.equal(result.body.profile.activityCalendar.some((day) => day.date === "2026-01-01" && day.github > 0), false);
});
