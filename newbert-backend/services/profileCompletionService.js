function hasText(value) {
  return typeof value === "string" && Boolean(value.trim());
}

function isProfileComplete(profile) {
  return getMissingProfileFields(profile).length === 0;
}

function getMissingProfileFields(profile) {
  const checks = {
    college: Boolean(profile?.collegeId || profile?.collegeRef),
    branch: hasText(profile?.branch),
    graduationYear: Number.isInteger(Number(profile?.graduationYear)) && Number(profile?.graduationYear) >= 2020 && Number(profile?.graduationYear) <= 2040,
    targetRole: hasText(profile?.targetRole),
  };
  return Object.keys(checks).filter((key) => !checks[key]);
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

module.exports = { isProfileComplete, getMissingProfileFields, profileStrength };
