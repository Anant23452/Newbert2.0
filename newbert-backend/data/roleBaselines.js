const ROLE_BASELINES = Object.freeze({
  frontend_engineer: ["HTML", "CSS", "JavaScript", "Git", "Web fundamentals"],
  backend_engineer: ["Programming", "REST APIs", "Git", "Databases", "Authentication"],
  fullstack_engineer: ["HTML", "CSS", "JavaScript", "REST APIs", "Git", "Databases"],
  software_engineer: ["Programming", "DSA", "Git", "Testing", "CS fundamentals"],
  ml_engineer: ["Python", "Machine Learning", "Statistics", "Git", "Data handling"],
  data_analyst: ["SQL", "Spreadsheets", "Statistics", "Data visualization"],
  data_scientist: ["Python", "SQL", "Statistics", "Machine Learning", "Data visualization"],
  devops_engineer: ["Linux", "Git", "Networking", "CI/CD", "Containers"],
  android_developer: ["Kotlin", "Android", "Git", "REST APIs", "Mobile fundamentals"],
});

function roleKey(value = "") {
  const role = String(value).toLowerCase();
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
  return ROLE_BASELINES[roleKey(role)].map((skill) => ({
    skill, source: "role_baseline", confidence: 0.55, importance: "baseline",
    evidenceText: `Recommended foundation for ${String(role || "software engineering").trim()} roles; not stated by this company.`,
  }));
}

module.exports = { ROLE_BASELINES, getRoleBaseline, roleKey };
