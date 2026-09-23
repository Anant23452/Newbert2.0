function hasText(value) {
  return typeof value === "string" && Boolean(value.trim());
}

function isProfileComplete(profile) {
  return getMissingProfileFields(profile).length === 0;
}

function hasJoinBasics(profile) {
  const year = Number(profile?.graduationYear);
  return Boolean(profile?.collegeId || profile?.collegeRef)
    && Number.isInteger(year) && year >= 1950 && year <= 2040;
}

function memberType(profile, now = new Date()) {
  if (!hasJoinBasics(profile)) return null;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric' }).formatToParts(now);
  const year = Number(parts.find(part => part.type === 'year').value);
  const month = Number(parts.find(part => part.type === 'month').value);
  return Number(profile.graduationYear) <= year - (month < 7 ? 1 : 0) ? 'SENIOR' : 'JUNIOR';
}

function getMissingProfileFields(profile) {
  const checks = {
    college: Boolean(profile?.collegeId || profile?.collegeRef),
    branch: hasText(profile?.branch),
    graduationYear: Number.isInteger(Number(profile?.graduationYear)) && Number(profile?.graduationYear) >= 1950 && Number(profile?.graduationYear) <= 2040,
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

module.exports = { isProfileComplete, hasJoinBasics, memberType, getMissingProfileFields, profileStrength };
