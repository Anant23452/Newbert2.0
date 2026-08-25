const SOFTWARE = [
  { key: "dsa", label: "DSA", type: "dsa", priority: "high", target: 250 },
  { key: "programming", label: "Programming", type: "skill-any", skills: ["JavaScript", "Java", "Python", "C++"], priority: "high" },
  { key: "react", label: "React", type: "skill", priority: "high" },
  { key: "nodejs", label: "Node.js", type: "skill", priority: "medium" },
  { key: "sql", label: "SQL", type: "skill", priority: "high" },
  { key: "projects", label: "Projects", type: "projects", priority: "high", target: 2 },
];

const REQUIREMENTS = {
  "software-placement": SOFTWARE,
  internship: SOFTWARE.map((item) => item.key === "dsa" ? { ...item, target: 120 } : item.key === "projects" ? { ...item, target: 1 } : item),
  "data-ai": [
    { key: "python", label: "Python", type: "skill", priority: "high" },
    { key: "sql", label: "SQL", type: "skill", priority: "high" },
    { key: "statistics", label: "Statistics", type: "skill", priority: "high" },
    { key: "machinelearning", label: "Machine Learning", type: "skill", priority: "high" },
    { key: "dsa", label: "Data Structures", type: "dsa", priority: "medium", target: 150 },
    { key: "projects", label: "Data / AI Projects", type: "projects", priority: "high", target: 2 },
  ],
  gate: [
    { key: "engineeringmathematics", label: "Engineering Mathematics", type: "skill", priority: "high" },
    { key: "coresubjects", label: "Core Subjects", type: "skill", priority: "high" },
    { key: "previousyearquestions", label: "Previous Year Questions", type: "skill", priority: "high" },
    { key: "mocktests", label: "Mock Tests", type: "skill", priority: "medium" },
  ],
  "government-psu": [
    { key: "coresubjects", label: "Core Subjects", type: "skill", priority: "high" },
    { key: "aptitude", label: "Aptitude", type: "skill", priority: "high" },
    { key: "reasoning", label: "Reasoning", type: "skill", priority: "medium" },
    { key: "currentaffairs", label: "Current Affairs", type: "skill", priority: "medium" },
    { key: "mocktests", label: "Mock Tests", type: "skill", priority: "medium" },
  ],
};

const CORE_BY_BRANCH = {
  electrical: ["Electrical Machines", "Power Systems", "Power Electronics", "Control Systems", "MATLAB", "Aptitude", "Core Interview Preparation"],
  electronics: ["Embedded Systems", "Microcontrollers", "VLSI", "Signal Processing", "PCB Design", "Aptitude", "Core Interview Preparation"],
  mechanical: ["Thermodynamics", "Manufacturing", "SolidWorks", "AutoCAD", "ANSYS", "Aptitude", "Core Interview Preparation"],
  civil: ["Structural Analysis", "Surveying", "AutoCAD", "STAAD.Pro", "Quantity Estimation", "Aptitude", "Core Interview Preparation"],
  chemical: ["Process Design", "Mass Transfer", "Heat Transfer", "Chemical Reaction Engineering", "Aspen HYSYS", "Aptitude", "Core Interview Preparation"],
  biotechnology: ["Molecular Biology", "Bioprocess Engineering", "Bioinformatics", "Cell Culture", "Genetic Engineering", "Aptitude", "Core Interview Preparation"],
};

function branchKey(branch) {
  const value = String(branch || "").toLowerCase();
  return Object.keys(CORE_BY_BRANCH).find((key) => value.includes(key)) || "";
}

function normalizeTargetType(value, role = "") {
  const combined = `${value || ""} ${role || ""}`.toLowerCase();
  if (/data|machine learning|\bai\b/.test(combined)) return "data-ai";
  if (/gate/.test(combined)) return "gate";
  if (/government|psu/.test(combined)) return "government-psu";
  if (/core/.test(combined)) return "core-placement";
  if (/intern/.test(combined)) return "internship";
  if (/software|developer|frontend|backend|full stack/.test(combined)) return "software-placement";
  return value || "custom";
}

function getTargetRequirements(target, branch) {
  const type = normalizeTargetType(target?.type, target?.role);
  if (type === "core-placement") {
    const skills = CORE_BY_BRANCH[branchKey(branch)] || ["Core Subjects", "Aptitude", "Technical Interview Preparation", "Projects"];
    return { type, requirements: skills.map((label, index) => ({ key: label.toLowerCase().replace(/[^a-z0-9]/g, ""), label, type: label === "Projects" ? "projects" : "skill", priority: index < 5 ? "high" : "medium", ...(label === "Projects" && { target: 1 }) })) };
  }
  return { type, requirements: REQUIREMENTS[type] || [
    { key: "domainskills", label: target?.role || "Target Skills", type: "skill", priority: "high" },
    { key: "projects", label: "Relevant Projects", type: "projects", priority: "high", target: 1 },
    { key: "interview", label: "Interview Preparation", type: "skill", priority: "medium" },
  ] };
}

module.exports = { getTargetRequirements, normalizeTargetType };
