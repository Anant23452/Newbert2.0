const COMMON_FUNDAMENTALS = [
  { key: "oop", label: "Object-Oriented Programming", skills: ["OOP", "Object-Oriented Programming", "Object Oriented Programming"], priority: "high" },
  { key: "dbms", label: "DBMS", skills: ["DBMS", "Database Management Systems"], priority: "high" },
  { key: "operating-systems", label: "Operating Systems", skills: ["Operating Systems", "OS"], priority: "medium" },
  { key: "computer-networks", label: "Computer Networks", skills: ["Computer Networks", "Networking"], priority: "medium" },
];

const PROGRAMMING_LANGUAGE = { key: "programming-language", label: "Programming Language", skills: ["JavaScript", "TypeScript", "Java", "Python", "C++", "C#", "Go"], priority: "high" };
const GIT = { key: "git", label: "Git", skills: ["Git", "GitHub"], priority: "medium" };
const TESTING = { key: "testing", label: "Testing", skills: ["Testing", "Unit Testing", "Jest", "Vitest", "Pytest", "JUnit"], priority: "medium" };
const API_SKILLS = { key: "api-design", label: "API Development", skills: ["REST API", "REST APIs", "API Development", "Express", "FastAPI", "Spring Boot"], priority: "high" };
const DATABASES = { key: "databases", label: "Databases", skills: ["SQL", "PostgreSQL", "MySQL", "MongoDB", "DBMS"], priority: "high" };

const ROLE_BENCHMARKS = {
  "software-engineer": {
    id: "software-engineer",
    label: "Software Engineer",
    aliases: ["software development", "software developer", "software engineering", "sde"],
    coreSkills: [PROGRAMMING_LANGUAGE, GIT, TESTING, API_SKILLS, DATABASES],
    recommendedSkills: ["Debugging", "Data Structures and Algorithms", "System Design"],
    fundamentals: COMMON_FUNDAMENTALS,
    dsa: { targetTotalSolved: 250 },
    projects: { targetCount: 2 },
    activity: { targetActiveDays30: 12 },
  },
  "frontend-developer": {
    id: "frontend-developer",
    label: "Frontend Developer",
    aliases: ["frontend", "front end developer", "front-end developer"],
    coreSkills: [
      { key: "html", label: "HTML", skills: ["HTML", "HTML5"], priority: "high" },
      { key: "css", label: "CSS", skills: ["CSS", "CSS3", "Tailwind CSS"], priority: "high" },
      { key: "javascript", label: "JavaScript", skills: ["JavaScript", "TypeScript"], priority: "high" },
      { key: "frontend-framework", label: "Frontend Framework", skills: ["React", "Vue", "Angular"], priority: "high" },
      GIT,
      TESTING,
    ],
    recommendedSkills: ["Accessibility", "Responsive Design", "Web Performance"],
    fundamentals: COMMON_FUNDAMENTALS,
    dsa: { targetTotalSolved: 150 },
    projects: { targetCount: 2 },
    activity: { targetActiveDays30: 12 },
  },
  "backend-developer": {
    id: "backend-developer",
    label: "Backend Developer",
    aliases: ["backend", "back end developer", "back-end developer"],
    coreSkills: [
      PROGRAMMING_LANGUAGE,
      { key: "backend-framework", label: "Backend Framework", skills: ["Node.js", "Express", "Django", "Flask", "FastAPI", "Spring Boot", ".NET"], priority: "high" },
      DATABASES,
      API_SKILLS,
      GIT,
      TESTING,
    ],
    recommendedSkills: ["Authentication", "Caching", "Deployment"],
    fundamentals: COMMON_FUNDAMENTALS,
    dsa: { targetTotalSolved: 200 },
    projects: { targetCount: 2 },
    activity: { targetActiveDays30: 12 },
  },
  "fullstack-developer": {
    id: "fullstack-developer",
    label: "Full Stack Developer",
    aliases: ["full stack", "full-stack developer", "fullstack", "mern stack developer"],
    coreSkills: [
      { key: "javascript", label: "JavaScript", skills: ["JavaScript", "TypeScript"], priority: "high" },
      { key: "frontend-framework", label: "Frontend Framework", skills: ["React", "Vue", "Angular"], priority: "high" },
      { key: "backend-framework", label: "Backend Framework", skills: ["Node.js", "Express", "Django", "Flask", "FastAPI", "Spring Boot"], priority: "high" },
      DATABASES,
      API_SKILLS,
      GIT,
    ],
    recommendedSkills: ["Testing", "Authentication", "Deployment"],
    fundamentals: COMMON_FUNDAMENTALS,
    dsa: { targetTotalSolved: 200 },
    projects: { targetCount: 3 },
    activity: { targetActiveDays30: 12 },
  },
};

function normalizeRoleValue(value) {
  return String(value || "").trim().toLowerCase().replace(/[_\s]+/g, "-").replace(/-+/g, "-");
}

function getRoleBenchmark(value) {
  const normalized = normalizeRoleValue(value);
  if (!normalized) return null;
  if (ROLE_BENCHMARKS[normalized]) return ROLE_BENCHMARKS[normalized];
  return Object.values(ROLE_BENCHMARKS).find((role) => {
    const candidates = [role.label, ...role.aliases].map(normalizeRoleValue);
    return candidates.includes(normalized);
  }) || null;
}

module.exports = { ROLE_BENCHMARKS, getRoleBenchmark, normalizeRoleValue };
