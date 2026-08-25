function hasText(value) {
  return typeof value === "string" && Boolean(value.trim());
}

function isProfileComplete(profile) {
  return Boolean(profile && hasText(profile.college) && hasText(profile.branch));
}

function profileStrength(profile) {
  const checks = [
    isProfileComplete(profile),
    Array.isArray(profile?.skills) && profile.skills.length > 0,
    hasText(profile?.targetRole),
    hasText(profile?.githubUsername || profile?.githubUrl),
    hasText(profile?.leetcodeUsername || profile?.leetcodeUrl),
    hasText(profile?.linkedinUrl),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

module.exports = { isProfileComplete, profileStrength };
