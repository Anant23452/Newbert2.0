const ALIASES = new Map([
  ["js", "javascript"], ["javascript", "javascript"],
  ["ts", "typescript"], ["typescript", "typescript"],
  ["node", "nodejs"], ["nodejs", "nodejs"], ["node.js", "nodejs"], ["node js", "nodejs"],
  ["react", "react"], ["reactjs", "react"], ["react.js", "react"], ["react js", "react"],
  ["next", "nextjs"], ["nextjs", "nextjs"], ["next.js", "nextjs"], ["next js", "nextjs"],
  ["express", "express"], ["expressjs", "express"], ["express.js", "express"], ["express js", "express"],
  ["mongo", "mongodb"], ["mongo db", "mongodb"], ["mongodb", "mongodb"],
  ["mongoose", "mongoose"],
  ["postgres", "postgresql"], ["postgresql", "postgresql"], ["postgre sql", "postgresql"], ["pg", "postgresql"],
  ["mysql", "mysql"], ["my sql", "mysql"],
  ["redis", "redis"],
  ["prisma", "prisma"],
  ["tailwind", "tailwind"], ["tailwindcss", "tailwind"], ["tailwind css", "tailwind"], ["tailwind-css", "tailwind"],
  ["docker", "docker"], ["dockerfile", "docker"], ["docker-compose", "docker"],
  ["vite", "vite"], ["vitejs", "vite"], ["vite.js", "vite"],
  ["redux", "redux"], ["redux-toolkit", "redux"], ["@reduxjs/toolkit", "redux"], ["redux toolkit", "redux"],
  ["zustand", "zustand"],
  ["socketio", "socketio"], ["socket.io", "socketio"], ["socket io", "socketio"],
  ["py", "python"], ["python", "python"],
  ["java", "java"],
  ["c", "c"], ["cpp", "c++"], ["c++", "c++"], ["cplusplus", "c++"],
  ["sql", "sql"],
  ["html", "html"], ["css", "css"], ["html/css", "html-css"], ["html css", "html-css"],
  ["sklearn", "scikit-learn"], ["scikit learn", "scikit-learn"], ["scikit-learn", "scikit-learn"],
  ["tensorflow", "tensorflow"], ["pytorch", "pytorch"],
  ["flask", "flask"], ["fastapi", "fastapi"], ["fast-api", "fastapi"], ["django", "django"],
  ["jwt", "jwt"], ["oauth", "oauth"], ["oauth2", "oauth"],
  ["rest", "rest-api"], ["rest api", "rest-api"], ["rest apis", "rest-api"], ["restful api", "rest-api"], ["restful apis", "rest-api"],
  ["git", "git"], ["github", "github"],
  ["cicd", "cicd"], ["ci-cd", "cicd"], ["github actions", "cicd"], ["github-actions", "cicd"],
  ["data structures and algorithms", "dsa"], ["data structure and algorithms", "dsa"], ["algorithms", "dsa"], ["dsa", "dsa"],
  ["object oriented programming", "oop"], ["object-oriented programming", "oop"], ["oop", "oop"],
  ["database management systems", "dbms"], ["dbms", "dbms"],
  ["operating system", "operating-systems"], ["operating systems", "operating-systems"], ["os", "operating-systems"],
  ["computer network", "computer-networks"], ["computer networks", "computer-networks"], ["networking", "computer-networks"],
  ["system design", "system-design"],
  ["cse", "computer-science-engineering"], ["computer science", "computer-science-engineering"], ["computer science engineering", "computer-science-engineering"], ["computer science and engineering", "computer-science-engineering"],
  ["it", "information-technology"], ["information technology", "information-technology"],
  ["ece", "electronics-communication-engineering"], ["electronics and communication engineering", "electronics-communication-engineering"],
  ["ee", "electrical-engineering"], ["electrical engineering", "electrical-engineering"],
  ["me", "mechanical-engineering"], ["mechanical engineering", "mechanical-engineering"],
  ["ce", "civil-engineering"], ["civil engineering", "civil-engineering"],
]);

const LABELS = {
  javascript: "JavaScript", typescript: "TypeScript", nodejs: "Node.js", react: "React", nextjs: "Next.js", express: "Express.js",
  mongodb: "MongoDB", mongoose: "Mongoose", postgresql: "PostgreSQL", mysql: "MySQL", redis: "Redis", prisma: "Prisma",
  tailwind: "Tailwind CSS", docker: "Docker", vite: "Vite", redux: "Redux", zustand: "Zustand", socketio: "Socket.io",
  python: "Python", java: "Java", "c++": "C++", c: "C", sql: "SQL", "html-css": "HTML / CSS", html: "HTML", css: "CSS",
  "scikit-learn": "scikit-learn", tensorflow: "TensorFlow", pytorch: "PyTorch",
  flask: "Flask", fastapi: "FastAPI", django: "Django",
  jwt: "JWT", oauth: "OAuth",
  "rest-api": "REST APIs", git: "Git", github: "GitHub", cicd: "CI/CD (GitHub Actions)",
  dsa: "DSA", oop: "OOP", dbms: "DBMS", "operating-systems": "Operating Systems", "computer-networks": "Computer Networks", "system-design": "System Design",
  "computer-science-engineering": "Computer Science and Engineering", "information-technology": "Information Technology", "electronics-communication-engineering": "Electronics and Communication Engineering", "electrical-engineering": "Electrical Engineering", "mechanical-engineering": "Mechanical Engineering", "civil-engineering": "Civil Engineering",
};

const CATEGORIES = {
  javascript: "languages", typescript: "languages", python: "languages", java: "languages", "c++": "languages", c: "languages", sql: "languages",
  react: "frameworks", nextjs: "frameworks", express: "frameworks", nodejs: "frameworks", zustand: "frameworks", redux: "frameworks",
  flask: "frameworks", fastapi: "frameworks", django: "frameworks", tensorflow: "frameworks", pytorch: "frameworks", "scikit-learn": "frameworks",
  mongodb: "databases", mongoose: "databases", postgresql: "databases", mysql: "databases", redis: "databases", prisma: "databases",
  tailwind: "ui_tooling", html: "ui_tooling", css: "ui_tooling", "html-css": "ui_tooling",
  docker: "tools", cicd: "tools", vite: "tools", git: "tools", github: "tools", socketio: "tools",
  dsa: "fundamentals", oop: "fundamentals", dbms: "fundamentals", "operating-systems": "fundamentals", "computer-networks": "fundamentals", "rest-api": "fundamentals", "system-design": "fundamentals", jwt: "fundamentals", oauth: "fundamentals",
};

const NON_CAREER_PACKAGES = new Set([
  "axios", "clsx", "lucide-react", "react-toastify", "date-fns", "dotenv", "cors",
  "cookie-parser", "nodemon", "bcrypt", "bcryptjs", "class-variance-authority",
  "tailwind-merge", "framer-motion", "morgan", "concurrently", "cross-env", "rimraf",
  "path", "fs", "body-parser", "lodash", "moment", "chalk", "supertest", "jest",
  "prettier", "eslint",
]);

const RELATED = new Map([
  ["postgresql", new Set(["sql", "databases"])],
  ["mysql", new Set(["sql", "databases"])],
  ["mongodb", new Set(["databases", "mongoose"])],
  ["mongoose", new Set(["mongodb", "databases"])],
  ["express", new Set(["nodejs", "backend-framework"])],
  ["nodejs", new Set(["express", "backend-framework"])],
  ["react", new Set(["frontend-framework", "javascript", "nextjs"])],
  ["nextjs", new Set(["react", "frontend-framework", "javascript"])],
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

function getSkillCategory(value) {
  const canonical = normalizeSkill(value);
  return CATEGORIES[canonical] || "tools";
}

function isCareerSkill(value) {
  const norm = phrase(value).replace(/[.\s_-]/g, "");
  if (NON_CAREER_PACKAGES.has(norm) || NON_CAREER_PACKAGES.has(phrase(value))) return false;
  return true;
}

function getSkillTargetRelevance(skill, targetRole = "software engineer") {
  const role = phrase(targetRole);
  const norm = normalizeSkill(skill);
  const cat = getSkillCategory(norm);

  if (/frontend|ui|web developer|react/.test(role)) {
    if (["react", "nextjs", "typescript", "javascript", "tailwind", "html-css"].includes(norm)) return "HIGH";
    if (["nodejs", "rest-api", "git", "vite", "redux", "zustand"].includes(norm)) return "MEDIUM";
    return "LOW";
  }

  if (/backend|node|api|server/.test(role)) {
    if (["nodejs", "express", "mongodb", "postgresql", "mysql", "redis", "rest-api", "sql", "prisma", "mongoose", "docker"].includes(norm)) return "HIGH";
    if (["typescript", "javascript", "python", "dsa", "dbms", "system-design", "oop"].includes(norm)) return "HIGH";
    if (["react", "nextjs", "tailwind"].includes(norm)) return "MEDIUM";
    return "LOW";
  }

  if (/full\s*stack|mern|software developer|software engineer|sde/.test(role)) {
    if (["react", "nodejs", "javascript", "typescript", "mongodb", "postgresql", "express", "dsa", "dbms", "rest-api"].includes(norm)) return "HIGH";
    if (["nextjs", "tailwind", "redis", "docker", "prisma", "sql", "oop", "system-design", "git"].includes(norm)) return "HIGH";
    if (["vite", "zustand", "redux", "cicd"].includes(norm)) return "MEDIUM";
    return "LOW";
  }

  if (/data|ai|machine learning|ml/.test(role)) {
    if (["python", "sql", "tensorflow", "pytorch", "scikit-learn", "dsa", "fastapi"].includes(norm)) return "HIGH";
    if (["postgresql", "mongodb", "docker", "git"].includes(norm)) return "MEDIUM";
    return "LOW";
  }

  if (["dsa", "oop", "dbms", "operating-systems", "computer-networks", "problem-solving"].includes(norm)) return "HIGH";
  if (cat === "languages" || cat === "frameworks" || cat === "databases") return "MEDIUM";
  return "OPTIONAL";
}

function areRelatedSkills(left, right) {
  const first = normalizeSkill(left);
  const second = normalizeSkill(right);
  if (!first || !second || first === second) return false;
  return Boolean(RELATED.get(first)?.has(second) || RELATED.get(second)?.has(first));
}

module.exports = {
  ALIASES,
  CATEGORIES,
  LABELS,
  NON_CAREER_PACKAGES,
  RELATED,
  areRelatedSkills,
  getSkillCategory,
  getSkillTargetRelevance,
  isCareerSkill,
  normalizeSkill,
  normalizeSkillList,
  skillLabel,
};
