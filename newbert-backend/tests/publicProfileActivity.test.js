const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizePrivacy, serializePublicProfile } = require("../services/publicProfileService");
const { buildLeaderboardEntry } = require("../services/leaderboardService");
const { calculateStreaks } = require("../Controllers/profileController");

const user = { _id: "507f1f77bcf86cd799439011", name: "Test Student", avatarUrl: "" };

function profile(overrides = {}) {
  return {
    userId: user._id,
    githubUsername: "octocat",
    leetcodeUsername: "student",
    linkedinUrl: "https://linkedin.com/in/student",
    githubStats: { username: "octocat", publicRepos: 2 },
    leetcodeStats: { username: "student", totalSolved: 20 },
    activityCalendar: [{ date: "2026-08-30", github: 4, leetcode: 3, total: 7 }],
    currentStreak: 3,
    longestStreak: 8,
    privacy: { profileVisibility: "public", sections: {} },
    ...overrides,
  };
}

test("private public profile does not expose streak, links, or daily activity", () => {
  const result = serializePublicProfile(profile({ privacy: { profileVisibility: "private", sections: {} } }), user, null, { visible: true });
  assert.equal(result.private, true);
  assert.equal(result.leaderboard, undefined);
  assert.equal(result.college, undefined);
  assert.equal(result.branch, undefined);
  assert.equal(result.activityCalendar, undefined);
  assert.equal(result.linkedin, undefined);
  assert.equal(result.streakLeaderboard, undefined);
});

test("old profiles receive safe privacy defaults without exposing LinkedIn", () => {
  const privacy = normalizePrivacy(undefined);
  assert.equal(privacy.profileVisibility, "public");
  assert.equal(privacy.sections.github, true);
  assert.equal(privacy.sections.linkedin, false);

  const result = serializePublicProfile(profile({ privacy: undefined }), user);
  assert.equal(result.linkedin, undefined);
  assert.ok(!result.visibleSections.includes("linkedin"));
});

test("LinkedIn appears only when its section is explicitly public", () => {
  const hidden = serializePublicProfile(profile({ privacy: { profileVisibility: "public", sections: { linkedin: false } } }), user);
  const visible = serializePublicProfile(profile({ privacy: { profileVisibility: "public", sections: { linkedin: true } } }), user);
  assert.equal(hidden.linkedin, undefined);
  assert.equal(visible.linkedin.url, "https://linkedin.com/in/student");
  assert.ok(visible.visibleSections.includes("linkedin"));
});

test("legacy private visibility remains private during migration", () => {
  const normalized = normalizePrivacy({ profileVisibility: "public", sections: {} }, "private");
  assert.equal(normalized.profileVisibility, "private");
});

test("public profile returns at most three featured public projects with safe links", () => {
  const projectDetails = [
    { id: "one", name: "One", isFeatured: true, visibility: "public", repoUrl: "https://github.com/student/one", confirmedTechnologies: ["React"] },
    { id: "two", name: "Two", isFeatured: true, visibility: "private", repoUrl: "https://github.com/student/two" },
    { id: "three", name: "Three", isFeatured: true, visibility: "public", repositoryPrivate: true, repoUrl: "https://github.com/student/three", technologies: ["Node.js"] },
    { id: "four", name: "Four", isFeatured: true, visibility: "public", liveUrl: "javascript:alert(1)" },
    { id: "five", name: "Five", isFeatured: true, visibility: "public" },
  ];
  const result = serializePublicProfile(profile({ projectDetails }), user);
  assert.deepEqual(result.projects.featured.map((project) => project.id), ["one", "three", "four"]);
  assert.equal(result.projects.featured[1].repoUrl, "");
  assert.equal(result.projects.featured[2].liveUrl, "");
  assert.equal(result.projects.count, 3);
});

test("private heatmap keeps public streak totals but hides exact dates", () => {
  const result = serializePublicProfile(profile({ privacy: { profileVisibility: "public", sections: { activityHeatmap: false } } }), user, null, { visible: true });
  assert.equal(result.leaderboard.streakDays, 3);
  assert.equal(result.activityPrivacy.heatmapVisible, false);
  assert.equal(result.activityCalendar, undefined);
});

test("hidden GitHub section removes GitHub counts from public activity", () => {
  const result = serializePublicProfile(profile({ privacy: { profileVisibility: "public", sections: { github: false, leetcode: true } } }), user);
  assert.equal(result.github, undefined);
  assert.deepEqual(result.activityCalendar, [{ date: "2026-08-30", github: 0, leetcode: 3, total: 3 }]);
});

test("leaderboard entry hides private platform and private streak metrics", () => {
  const entry = buildLeaderboardEntry(profile({ privacy: { profileVisibility: "public", sections: { github: false, leetcode: true, streakStats: false } } }), user);
  assert.equal(entry.github.connected, false);
  assert.equal(entry.leetcode.connected, true);
  assert.equal(entry.streak.private, true);
});

test("current streak keeps yesterday's run while today is incomplete", () => {
  const indiaDate = (offset) => {
    const date = new Date(Date.now() + offset * 86400000);
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  };
  const activity = [-3, -2, -1].map((offset) => ({ date: indiaDate(offset), github: 1, leetcode: 0, total: 1 }));
  assert.equal(calculateStreaks(activity).currentStreak, 3);
});

test("private profile returns strictly minimal safe identity payload with zero leaks", () => {
  const fullProfile = profile({
    bio: "Secret bio",
    skills: [{ name: "React" }, { name: "Node.js" }],
    targetRole: "Frontend Engineer",
    targetCompany: "Google",
    cgpa: 9.2,
    graduationYear: 2026,
    projectDetails: [{ id: "p1", name: "Secret Project", isFeatured: true, visibility: "public" }],
    privacy: { profileVisibility: "private", sections: { skills: true, projects: true, github: true } },
  });
  const result = serializePublicProfile(fullProfile, user, null, { visible: true });
  assert.equal(result.private, true);
  assert.equal(result.name, "Test Student");
  assert.equal(result.message, "This profile is private.");
  assert.deepEqual(result.visibleSections, []);
  assert.equal(result.about, undefined);
  assert.equal(result.skills, undefined);
  assert.equal(result.projects, undefined);
  assert.equal(result.github, undefined);
  assert.equal(result.leetcode, undefined);
  assert.equal(result.education, undefined);
  assert.equal(result.careerGoal, undefined);
  assert.equal(result.linkedin, undefined);
  assert.equal(result.activityCalendar, undefined);
  assert.equal(result.streakLeaderboard, undefined);
  assert.equal(result.targetCompany, undefined);
});

test("hidden projects section hides all projects even if individual projects are public and featured", () => {
  const projectDetails = [
    { id: "p1", name: "Project 1", isFeatured: true, visibility: "public" },
  ];
  const result = serializePublicProfile(profile({ projectDetails, privacy: { profileVisibility: "public", sections: { projects: false } } }), user);
  assert.equal(result.projects, undefined);
  assert.ok(!result.visibleSections.includes("projects"));
});

test("canJoinPublicLeaderboard strictly blocks private profiles from public leaderboard rankings", () => {
  const { canJoinPublicLeaderboard } = require("../services/leaderboardService");
  assert.equal(canJoinPublicLeaderboard({ privacy: { profileVisibility: "private", sections: { leaderboardRank: true } } }), false);
  assert.equal(canJoinPublicLeaderboard({ privacy: { profileVisibility: "public", sections: { leaderboardRank: false } } }), false);
  assert.equal(canJoinPublicLeaderboard({ privacy: { profileVisibility: "public", sections: { leaderboardRank: true } } }), true);
});
