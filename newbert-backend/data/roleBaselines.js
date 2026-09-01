// These are product baselines, not claims about a particular employer. Keep the
// categories qualitative so a fallback roadmap never presents invented precision.
const ROLE_BASELINES = Object.freeze({
  frontend_engineer: [
    ["programming", "JavaScript", "critical"], ["frontend", "Frontend fundamentals", "critical"],
    ["frontend", "React or a relevant framework", "high"], ["projects", "Frontend project evidence", "high"],
    ["dsa", "Problem solving", "medium"], ["communication", "Project communication", "medium"],
  ],
  backend_engineer: [
    ["programming", "Programming", "critical"], ["backend", "API design", "critical"],
    ["dbms", "Databases", "high"], ["projects", "Backend project evidence", "high"],
    ["dsa", "DSA", "high"], ["csFundamentals", "CS fundamentals", "high"],
  ],
  fullstack_engineer: [
    ["programming", "JavaScript", "critical"], ["frontend", "Frontend development", "high"],
    ["backend", "Backend and APIs", "high"], ["dbms", "Databases", "high"],
    ["projects", "Full-stack project evidence", "high"], ["dsa", "Problem solving", "medium"],
  ],
  software_engineer: [
    ["dsa", "DSA and problem solving", "critical"], ["programming", "Programming fundamentals", "critical"],
    ["csFundamentals", "CS fundamentals", "high"], ["projects", "Project evidence", "high"],
    ["development", "Development fundamentals", "medium"], ["communication", "Technical communication", "medium"],
  ],
  ml_engineer: [
    ["programming", "Python", "critical"], ["machineLearning", "Machine learning", "critical"],
    ["statistics", "Statistics", "high"], ["projects", "ML project evidence", "high"],
    ["data", "Data handling", "high"], ["dsa", "Problem solving", "medium"],
  ],
  data_analyst: [
    ["dbms", "SQL", "critical"], ["statistics", "Statistics", "high"],
    ["data", "Data analysis", "high"], ["projects", "Analysis portfolio", "high"],
    ["communication", "Insight communication", "high"], ["programming", "Programming", "medium"],
  ],
  data_scientist: [
    ["programming", "Python", "critical"], ["statistics", "Statistics", "critical"],
    ["machineLearning", "Machine learning", "high"], ["dbms", "SQL", "high"],
    ["projects", "Data project evidence", "high"], ["communication", "Insight communication", "medium"],
  ],
  devops_engineer: [
    ["operatingSystems", "Linux", "critical"], ["cloud", "Cloud fundamentals", "high"],
    ["devops", "CI/CD", "high"], ["devops", "Containers", "high"],
    ["computerNetworks", "Networking", "high"], ["projects", "Automation evidence", "high"],
  ],
  android_developer: [
    ["programming", "Kotlin or Java", "critical"], ["mobile", "Android fundamentals", "critical"],
    ["backend", "API integration", "high"], ["projects", "Mobile project evidence", "high"],
    ["dsa", "Problem solving", "medium"], ["communication", "Project communication", "medium"],
  ],
  gate: [
    ["engineeringMathematics", "Engineering mathematics", "critical"], ["coreSubjects", "Core branch subjects", "critical"],
    ["pyq", "Previous year questions", "high"], ["mockTests", "Mock tests", "high"],
    ["revision", "Revision cycles", "high"],
  ],
});

function roleKey(value = "") {
  const role = String(value).toLowerCase();
  if (/\bgate\b/.test(role)) return "gate";
  if (/full.?stack/.test(role)) return "fullstack_engineer";
  if (/front.?end|react|web developer/.test(role)) return "frontend_engineer";
  if (/back.?end|api developer/.test(role)) return "backend_engineer";
  if (/machine learning|\bml\b/.test(role)) return "ml_engineer";
  if (/data scientist/.test(role)) return "data_scientist";
  if (/data analyst/.test(role)) return "data_analyst";
  if (/devops|site reliability|\bsre\b/.test(role)) return "devops_engineer";
  if (/android/.test(role)) return "android_developer";
  return "software_engineer";
}

function getRoleBaseline(role) {
  return ROLE_BASELINES[roleKey(role)].map(([category, skill]) => ({
    skill, category, source: "role_baseline", confidence: 0.55, importance: "baseline",
    evidenceText: `Recommended foundation for ${String(role || "software engineering").trim()} roles; not stated by this company.`,
  }));
}

function getRoleCategories(role) {
  return ROLE_BASELINES[roleKey(role)].map(([key, label, importance]) => ({
    key, label, importance, confidence: "low", source: "role_baseline",
    reason: `Newbert uses this as a fallback foundation for ${String(role || "the selected role").trim()}. It is not an employer-specific claim.`,
  }));
}

module.exports = { ROLE_BASELINES, getRoleBaseline, getRoleCategories, roleKey };
