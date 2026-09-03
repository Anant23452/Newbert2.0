const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizePrivacy, serializePublicProfile } = require("../services/publicProfileService");

const mockUser = {
  _id: "60d0fe4f5311236168a109ca",
  name: "Anant Kumar",
  avatarUrl: "https://example.com/avatar.png",
};

function createMockProfile(privacyOverrides = {}, projectDetails = []) {
  return {
    userId: mockUser._id,
    bio: "Full stack developer interested in distributed systems.",
    githubUsername: "anantkumar",
    leetcodeUsername: "anant_lc",
    linkedinUrl: "https://linkedin.com/in/anantkumar",
    targetRole: "Software Engineer",
    projects: 3,
    projectDetails: projectDetails.length ? projectDetails : [
      { id: "proj-1", name: "Newbert 2.0", isFeatured: true, visibility: "public", repoUrl: "https://github.com/anant/newbert" },
      { id: "proj-2", name: "DevHub", isFeatured: true, visibility: "private", repoUrl: "https://github.com/anant/devhub" },
      { id: "proj-3", name: "Portfolio", isFeatured: true, visibility: "public", repoUrl: "https://github.com/anant/portfolio" },
    ],
    githubStats: {
      username: "anantkumar",
      publicRepos: 15,
      contributionActivityAvailable: true,
    },
    leetcodeStats: {
      username: "anant_lc",
      totalSolved: 150,
      acceptedActivityAvailable: true,
    },
    activityCalendar: [
      { date: "2026-09-01", github: 5, leetcode: 2, total: 7 },
      { date: "2026-09-02", github: 3, leetcode: 1, total: 4 },
    ],
    currentStreak: 12,
    longestStreak: 20,
    privacy: privacyOverrides,
  };
}

test("TEST 1: New user with no privacy data defaults all privacy-capable fields to Public", () => {
  const normalized = normalizePrivacy(undefined);
  assert.equal(normalized.profileVisibility, "public");
  assert.equal(normalized.github, "public");
  assert.equal(normalized.leetcode, "public");
  assert.equal(normalized.linkedin, "public");
  assert.equal(normalized.bio, "public");
  assert.equal(normalized.about, "public");
  assert.equal(normalized.projects, "public");

  assert.equal(normalized.sections.github, true);
  assert.equal(normalized.sections.leetcode, true);
  assert.equal(normalized.sections.linkedin, true);
  assert.equal(normalized.sections.about, true);
  assert.equal(normalized.sections.projects, true);
  assert.equal(normalized.sections.activityHeatmap, true);
  assert.equal(normalized.sections.streakStats, true);
  assert.equal(normalized.sections.leaderboardRank, true);
});

test("TEST 2: Changing single field to Private preserves other fields as Public", () => {
  const currentPrivacy = {
    profileVisibility: "public",
    sections: {
      github: false,
    },
  };

  const normalized = normalizePrivacy(currentPrivacy);
  assert.equal(normalized.github, "private");
  assert.equal(normalized.sections.github, false);

  assert.equal(normalized.leetcode, "public");
  assert.equal(normalized.sections.leetcode, true);
  assert.equal(normalized.linkedin, "public");
  assert.equal(normalized.sections.linkedin, true);
  assert.equal(normalized.bio, "public");
  assert.equal(normalized.projects, "public");
});

test("TEST 3: Multiple fields set to Private are preserved together", () => {
  const currentPrivacy = {
    profileVisibility: "public",
    sections: {
      github: false,
      leetcode: false,
      linkedin: false,
    },
  };

  const normalized = normalizePrivacy(currentPrivacy);
  assert.equal(normalized.github, "private");
  assert.equal(normalized.leetcode, "private");
  assert.equal(normalized.linkedin, "private");
  assert.equal(normalized.bio, "public");
  assert.equal(normalized.projects, "public");
});

test("TEST 4: Changing GitHub back to Public works and does not mutate other fields", () => {
  const currentPrivacy = {
    profileVisibility: "public",
    sections: {
      github: true,
      leetcode: false,
    },
  };

  const normalized = normalizePrivacy(currentPrivacy);
  assert.equal(normalized.github, "public");
  assert.equal(normalized.leetcode, "private");
  assert.equal(normalized.sections.github, true);
  assert.equal(normalized.sections.leetcode, false);
});

test("TEST 5: Visitor requesting public profile cannot see private GitHub or LeetCode data", () => {
  const profileWithPrivateGitAndLC = createMockProfile({
    profileVisibility: "public",
    sections: {
      github: false,
      leetcode: false,
      linkedin: true,
      about: true,
      projects: true,
    },
  });

  const serialized = serializePublicProfile(profileWithPrivateGitAndLC, mockUser, null);

  assert.equal(serialized.github, undefined);
  assert.equal(serialized.leetcode, undefined);
  assert.ok(!serialized.visibleSections.includes("github"));
  assert.ok(!serialized.visibleSections.includes("leetcode"));

  assert.ok(serialized.visibleSections.includes("linkedin"));
  assert.equal(serialized.linkedin.url, "https://linkedin.com/in/anantkumar");
  assert.ok(serialized.visibleSections.includes("about"));
  assert.equal(serialized.about.bio, "Full stack developer interested in distributed systems.");
});

test("TEST 6: Visitor requesting public profile cannot see private Bio/About", () => {
  const profileWithPrivateBio = createMockProfile({
    profileVisibility: "public",
    sections: {
      about: false,
    },
  });

  const serialized = serializePublicProfile(profileWithPrivateBio, mockUser, null);
  assert.equal(serialized.about, undefined);
  assert.ok(!serialized.visibleSections.includes("about"));
});

test("TEST 7: Individual project privacy hides private project from public profile", () => {
  const profile = createMockProfile({
    profileVisibility: "public",
    sections: { projects: true },
  });

  const serialized = serializePublicProfile(profile, mockUser, null);
  assert.ok(serialized.projects);
  assert.equal(serialized.projects.count, 2);
  const names = serialized.projects.featured.map((p) => p.name);
  assert.ok(names.includes("Newbert 2.0"));
  assert.ok(names.includes("Portfolio"));
  assert.ok(!names.includes("DevHub"), "Private project DevHub must not be exposed in public profile");
});

test("TEST 8: Global project privacy hides all projects from public profile", () => {
  const profile = createMockProfile({
    profileVisibility: "public",
    sections: { projects: false },
  });

  const serialized = serializePublicProfile(profile, mockUser, null);
  assert.equal(serialized.projects, undefined);
  assert.ok(!serialized.visibleSections.includes("projects"));
});

test("TEST 9: Entire profile set to Private hides all content from visitor", () => {
  const lockedProfile = createMockProfile({
    profileVisibility: "private",
    sections: {},
  });

  const serialized = serializePublicProfile(lockedProfile, mockUser, null);
  assert.equal(serialized.private, true);
  assert.equal(serialized.isPrivate, true);
  assert.equal(serialized.github, undefined);
  assert.equal(serialized.leetcode, undefined);
  assert.equal(serialized.linkedin, undefined);
  assert.equal(serialized.about, undefined);
  assert.equal(serialized.projects, undefined);
  assert.equal(serialized.activityCalendar, undefined);
  assert.equal(serialized.streakLeaderboard, undefined);
  assert.deepEqual(serialized.visibleSections, []);
});
