// ─────────────────────────────────────────────────────────────────────────────
// SIMPLIFIED 6-CATEGORY TAXONOMY & COMPANY CATEGORY BASELINES
// ─────────────────────────────────────────────────────────────────────────────

const COMPANY_CATEGORY_BASELINES = Object.freeze({
  service: [
    ["assessment", "Assessment & Communication", "high", "Service-based hiring filters heavily on online aptitude, reasoning, and communicative clarity."],
    ["coding", "Coding & Problem Solving", "high", "Foundational programming syntax, OOP logic, and basic problem solving are required for technical screening."],
    ["cs_core", "CS Core", "high", "DBMS (SQL queries), basic Operating Systems, and Computer Networks are tested in core interview rounds."],
    ["project_evidence", "Project Evidence", "medium", "Verified project implementation demonstrates practical understanding during interview discussions."],
    ["development", "Development & Project Engineering", "medium", "Basic development ability and framework familiarity provide a strong baseline for client deployments."],
    ["system_design", "System Design", "low", "Advanced system design is rarely evaluated for entry-level service company roles."],
  ],
  product: [
    ["coding", "Coding & Problem Solving", "critical", "Product-based company hiring centers on algorithmic problem solving, DSA pattern mastery, and optimization."],
    ["cs_core", "CS Core", "high", "In-depth understanding of DBMS concurrency/indexing, OS memory/threads, and networks is tested in core technical rounds."],
    ["project_evidence", "Project Evidence", "high", "Product teams look for strong project depth, architecture ownership, and code quality."],
    ["development", "Development & Project Engineering", "medium", "Modern frameworks, testing, and clean code principles demonstrate engineering maturity."],
    ["system_design", "System Design", "medium", "Fundamental system design concepts (caching, scalability, DB design) are tested in SDE interviews."],
    ["assessment", "Assessment & Communication", "low", "Aptitude tests are rarely used; evaluation focuses directly on technical coding and architecture."],
  ],
  startup: [
    ["development", "Development & Project Engineering", "critical", "Startups require immediate practical building capability—APIs, database design, auth, Docker, and full-stack implementation."],
    ["project_evidence", "Project Evidence", "critical", "Live deployments, GitHub repositories, and verifiable code are the primary hiring signals for startups."],
    ["coding", "Coding & Problem Solving", "high", "Practical problem solving, bug fixing, scripting, and essential data structure fluency are key."],
    ["cs_core", "CS Core", "medium", "Database query optimization and network protocols support reliable production engineering."],
    ["system_design", "System Design", "medium", "System architecture and pragmatic database schema choices directly impact startup scalability."],
    ["assessment", "Assessment & Communication", "low", "Startups do not use generic aptitude tests; they test practical building ability in take-home or live pairing."],
  ],
});

// Role fallback definitions using the simplified 6-category taxonomy
const ROLE_BASELINES = Object.freeze({
  frontend_engineer: [
    ["development", "Development & Project Engineering", "critical"],
    ["project_evidence", "Project Evidence", "high"],
    ["coding", "Coding & Problem Solving", "high"],
    ["cs_core", "CS Core", "medium"],
    ["assessment", "Assessment & Communication", "medium"],
    ["system_design", "System Design", "low"],
  ],
  backend_engineer: [
    ["development", "Development & Project Engineering", "critical"],
    ["cs_core", "CS Core", "high"],
    ["coding", "Coding & Problem Solving", "high"],
    ["project_evidence", "Project Evidence", "high"],
    ["system_design", "System Design", "medium"],
    ["assessment", "Assessment & Communication", "low"],
  ],
  fullstack_engineer: [
    ["development", "Development & Project Engineering", "critical"],
    ["project_evidence", "Project Evidence", "high"],
    ["coding", "Coding & Problem Solving", "high"],
    ["cs_core", "CS Core", "high"],
    ["system_design", "System Design", "medium"],
    ["assessment", "Assessment & Communication", "low"],
  ],
  software_engineer: [
    ["coding", "Coding & Problem Solving", "critical"],
    ["cs_core", "CS Core", "high"],
    ["project_evidence", "Project Evidence", "high"],
    ["development", "Development & Project Engineering", "medium"],
    ["system_design", "System Design", "medium"],
    ["assessment", "Assessment & Communication", "medium"],
  ],
  ml_engineer: [
    ["coding", "Coding & Problem Solving", "critical"],
    ["cs_core", "CS Core", "high"],
    ["project_evidence", "Project Evidence", "high"],
    ["development", "Development & Project Engineering", "medium"],
    ["assessment", "Assessment & Communication", "medium"],
  ],
  data_analyst: [
    ["cs_core", "CS Core", "critical"],
    ["coding", "Coding & Problem Solving", "high"],
    ["project_evidence", "Project Evidence", "high"],
    ["assessment", "Assessment & Communication", "high"],
    ["development", "Development & Project Engineering", "medium"],
  ],
  data_scientist: [
    ["coding", "Coding & Problem Solving", "critical"],
    ["cs_core", "CS Core", "high"],
    ["project_evidence", "Project Evidence", "high"],
    ["development", "Development & Project Engineering", "medium"],
    ["assessment", "Assessment & Communication", "medium"],
  ],
  devops_engineer: [
    ["development", "Development & Project Engineering", "critical"],
    ["cs_core", "CS Core", "high"],
    ["project_evidence", "Project Evidence", "high"],
    ["coding", "Coding & Problem Solving", "medium"],
    ["system_design", "System Design", "high"],
    ["assessment", "Assessment & Communication", "low"],
  ],
  android_developer: [
    ["development", "Development & Project Engineering", "critical"],
    ["project_evidence", "Project Evidence", "high"],
    ["coding", "Coding & Problem Solving", "high"],
    ["cs_core", "CS Core", "medium"],
    ["assessment", "Assessment & Communication", "medium"],
  ],
  gate: [
    ["engineeringMathematics", "Engineering Mathematics", "critical"],
    ["coreSubjects", "Core Branch Subjects", "critical"],
    ["pyq", "Previous Year Questions", "high"],
    ["mockTests", "Mock Tests", "high"],
    ["revision", "Revision Cycles", "high"],
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

function normalizeCompanyCategory(category = "") {
  const cat = String(category || "").toLowerCase();
  if (cat.includes("service") || cat.includes("tcs") || cat.includes("infosys") || cat.includes("wipro") || cat.includes("accenture")) return "service";
  if (cat.includes("startup") || cat.includes("early") || cat.includes("seed")) return "startup";
  if (cat.includes("product") || cat.includes("faang") || cat.includes("tier1") || cat.includes("tier-1")) return "product";
  return null;
}

function getCompanyCategoryBaseline(category = "product", role = "") {
  const normCat = normalizeCompanyCategory(category) || "product";
  const rows = COMPANY_CATEGORY_BASELINES[normCat] || COMPANY_CATEGORY_BASELINES.product;
  return rows.map(([key, label, importance, reason]) => ({
    key,
    label,
    importance,
    confidence: "medium",
    source: "role_baseline",
    reason,
  }));
}

function getRoleCategories(role = "", companyCategory = null) {
  const key = roleKey(role);
  if (key === "gate") {
    return ROLE_BASELINES.gate.map(([k, label, importance]) => ({
      key: k,
      label,
      importance,
      confidence: "low",
      source: "role_baseline",
      reason: `Newbert uses this standard foundation for GATE preparation.`,
    }));
  }

  const normCat = normalizeCompanyCategory(companyCategory);
  if (normCat && COMPANY_CATEGORY_BASELINES[normCat]) {
    return getCompanyCategoryBaseline(normCat, role);
  }

  // Fallback to role baseline
  const roleList = ROLE_BASELINES[key] || ROLE_BASELINES.software_engineer;
  return roleList.map(([k, label, importance]) => ({
    key: k,
    label,
    importance,
    confidence: "low",
    source: "role_baseline",
    reason: `Newbert uses this as a fallback foundation for ${String(role || "the selected role").trim()}.`,
  }));
}

function getRoleBaseline(role = "", companyCategory = null) {
  return getRoleCategories(role, companyCategory).map((item) => ({
    skill: item.label,
    category: item.key,
    source: item.source || "role_baseline",
    confidence: item.confidence === "medium" ? 0.75 : 0.55,
    importance: item.importance,
    evidenceText: item.reason,
  }));
}

module.exports = {
  ROLE_BASELINES,
  COMPANY_CATEGORY_BASELINES,
  getRoleBaseline,
  getRoleCategories,
  getCompanyCategoryBaseline,
  normalizeCompanyCategory,
  roleKey,
};
