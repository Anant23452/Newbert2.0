const test = require("node:test");
const assert = require("node:assert/strict");
const { isProfileComplete, getMissingProfileFields } = require("../services/profileCompletionService");
const { providersNeedingSync, manualSkills, SYNC_STALE_MS } = require("../services/profileSyncPolicy");
const { buildTodaySummary } = require("../services/todayService");
const { extractStudentEvidence } = require("../services/nextUnlocksService");

const complete = { collegeId: "rec-ambedkar-nagar", branch: "Civil Engineering", graduationYear: 2027, targetRole: "Still exploring" };
test("essential onboarding supports students with no external accounts", () => {
  assert.equal(isProfileComplete(complete), true);
  assert.deepEqual(getMissingProfileFields({ college: "Raw college name", branch: "IT" }), ["college", "graduationYear", "targetRole"]);
  for (const year of [null, "", 0, 2041, 2027.5]) assert.equal(isProfileComplete({ ...complete, graduationYear: year }), false);
});
test("sync only fetches connected accounts with missing or stale data", () => {
  const now = Date.parse("2026-09-08T12:00:00Z");
  assert.deepEqual(providersNeedingSync({}, now), []);
  assert.deepEqual(providersNeedingSync({ githubUsername: "student" }, now), ["github"]);
  const profile = { githubUsername: "student", githubStats: { username: "student" }, evidenceCache: { github: { updatedAt: new Date(now - 1000) } } };
  assert.deepEqual(providersNeedingSync(profile, now), []);
  assert.deepEqual(providersNeedingSync(profile, now + SYNC_STALE_MS), ["github"]);
});
test("client skill scores and evidence sources cannot be forged", () => {
  assert.deepEqual(manualSkills([{ name: "SQL", score: 100, source: "github" }], []), [{ name: "SQL", score: 0, source: "manual" }]);
  assert.deepEqual(manualSkills([{ name: "SQL", score: 100 }], [{ name: "SQL", score: 35, source: "github" }]), [{ name: "SQL", score: 35, source: "github" }]);
});
test("a problem count alone does not verify DSA competence", () => {
  assert.equal(extractStudentEvidence({ leetcodeStats: { totalSolved: 700 } }, "dsa").status, "detected");
  assert.equal(extractStudentEvidence({ dsaSolved: 700 }, "dsa").status, "none");
});
test("Today uses actual unfinished tasks and completed work, never synthetic counts", () => {
  const now = new Date("2026-09-08T12:00:00Z");
  const result = buildTodaySummary({ now, plans: [{ _id: "plan-a", skillName: "SQL", status: "in_progress", tasks: [
    { id: "a", title: "Practice joins", order: 2, completed: false, estimatedMinutes: 20 },
    { id: "b", title: "Review basics", order: 1, completed: true, completedAt: new Date("2026-09-07") },
  ] }] });
  assert.deepEqual(result.tasks.map((t) => t.id), ["a"]);
  assert.equal(result.completedThisWeek, 1);
  assert.equal(result.applications, 0);
  assert.equal(buildTodaySummary({ now }).tasks.length, 0);
});
test("Today excludes expired/unverified jobs and already submitted applications from deadlines", () => {
  const now = new Date("2026-09-08T12:00:00Z");
  const job = { _id: "job-a", active: true, verification: { status: "verified" }, deadline: new Date("2026-09-10"), title: "Intern", company: "Test company" };
  const result = buildTodaySummary({ now, savedJobs: [
    { status: "saved", jobId: job }, { status: "applied", jobId: job },
    { status: "saved", jobId: { ...job, deadline: new Date("2026-09-01") } },
    { status: "saved", jobId: { ...job, verification: { status: "pending" } } },
    { status: "saved", jobId: null },
  ] });
  assert.equal(result.upcoming.length, 1);
  assert.equal(result.applications, 1);
});
