const ALIASES = new Map([
  ["js", "javascript"], ["javascript", "javascript"],
  ["ts", "typescript"], ["typescript", "typescript"],
  ["node", "nodejs"], ["nodejs", "nodejs"], ["node.js", "nodejs"], ["node js", "nodejs"],
  ["react", "react"], ["reactjs", "react"], ["react.js", "react"], ["react js", "react"],
  ["express", "express"], ["expressjs", "express"], ["express.js", "express"],
  ["mongo", "mongodb"], ["mongo db", "mongodb"], ["mongodb", "mongodb"],
  ["postgres", "postgresql"], ["postgresql", "postgresql"], ["postgre sql", "postgresql"],
  ["mysql", "mysql"], ["my sql", "mysql"],
  ["sklearn", "scikit-learn"], ["scikit learn", "scikit-learn"], ["scikit-learn", "scikit-learn"],
  ["rest", "rest-api"], ["rest api", "rest-api"], ["rest apis", "rest-api"], ["restful api", "rest-api"], ["restful apis", "rest-api"],
  ["git", "git"], ["github", "github"],
  ["cpp", "c++"], ["c++", "c++"],
  ["data structures and algorithms", "dsa"], ["data structure and algorithms", "dsa"], ["algorithms", "dsa"], ["dsa", "dsa"],
  ["object oriented programming", "oop"], ["object-oriented programming", "oop"], ["oop", "oop"],
  ["database management systems", "dbms"], ["dbms", "dbms"],
  ["operating system", "operating-systems"], ["operating systems", "operating-systems"], ["os", "operating-systems"],
  ["computer network", "computer-networks"], ["computer networks", "computer-networks"], ["networking", "computer-networks"],
  ["cse", "computer-science-engineering"], ["computer science", "computer-science-engineering"], ["computer science engineering", "computer-science-engineering"], ["computer science and engineering", "computer-science-engineering"],
  ["it", "information-technology"], ["information technology", "information-technology"],
  ["ece", "electronics-communication-engineering"], ["electronics and communication engineering", "electronics-communication-engineering"],
  ["ee", "electrical-engineering"], ["electrical engineering", "electrical-engineering"],
  ["me", "mechanical-engineering"], ["mechanical engineering", "mechanical-engineering"],
  ["ce", "civil-engineering"], ["civil engineering", "civil-engineering"],
]);

const LABELS = {
  javascript: "JavaScript", typescript: "TypeScript", nodejs: "Node.js", react: "React", express: "Express",
  mongodb: "MongoDB", postgresql: "PostgreSQL", mysql: "MySQL", "rest-api": "REST APIs", git: "Git", github: "GitHub",
  "scikit-learn": "scikit-learn",
  "c++": "C++", dsa: "DSA", oop: "OOP", dbms: "DBMS", "operating-systems": "Operating Systems", "computer-networks": "Computer Networks",
  "computer-science-engineering": "Computer Science and Engineering", "information-technology": "Information Technology", "electronics-communication-engineering": "Electronics and Communication Engineering", "electrical-engineering": "Electrical Engineering", "mechanical-engineering": "Mechanical Engineering", "civil-engineering": "Civil Engineering",
};

const RELATED = new Map([
  ["postgresql", new Set(["sql", "databases"])],
  ["mysql", new Set(["sql", "databases"])],
  ["mongodb", new Set(["databases"])],
  ["express", new Set(["nodejs", "backend-framework"])],
  ["nodejs", new Set(["express", "backend-framework"])],
  ["react", new Set(["frontend-framework", "javascript"])],
  ["rest-api", new Set(["api-development"])],
]);

function phrase(value) {
  return String(value || "").trim().toLowerCase().replace(/[_]+/g, " ").replace(/\s+/g, " ");
}

function normalizeSkill(value) {
  const normalized = phrase(value);
  if (!normalized) return "";
  const compact = normalized.replace(/[.\s_-]/g, "");
  return ALIASES.get(normalized) || ALIASES.get(compact) || normalized.replace(/[.\s_]/g, "-").replace(/-+/g, "-");
}

function normalizeSkillList(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => normalizeSkill(typeof value === "object" ? value.name : value)).filter(Boolean))];
}

function skillLabel(value) {
  const canonical = normalizeSkill(value);
  return LABELS[canonical] || String(value || "").trim() || canonical;
}

function areRelatedSkills(left, right) {
  const first = normalizeSkill(left);
  const second = normalizeSkill(right);
  if (!first || !second || first === second) return false;
  return Boolean(RELATED.get(first)?.has(second) || RELATED.get(second)?.has(first));
}

module.exports = { ALIASES, RELATED, areRelatedSkills, normalizeSkill, normalizeSkillList, skillLabel };
