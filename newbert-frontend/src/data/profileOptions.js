export const BRANCH_OPTIONS = [
  "Computer Science",
  "Information Technology",
  "Electrical Engineering",
  "Electronics",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Biotechnology",
  "Other",
];

export const TARGET_ROLE_OPTIONS = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Software Development",
  "Data / AI",
  "Core Engineering",
  "GATE",
  "Government / PSU",
  "Higher Studies",
  "Other",
];

const SOFTWARE_SKILLS = ["JavaScript", "React", "Node.js", "Python", "Java", "DSA", "SQL", "MongoDB", "Machine Learning"];
const BRANCH_SKILLS = {
  "Electrical Engineering": ["Power Systems", "Electrical Machines", "MATLAB", "Simulink", "PLC", "SCADA", "Power Electronics", "Control Systems"],
  Electronics: ["Embedded Systems", "Arduino", "VLSI", "Verilog", "Microcontrollers", "PCB Design", "Signal Processing"],
  "Mechanical Engineering": ["AutoCAD", "SolidWorks", "CATIA", "ANSYS", "Thermodynamics", "Manufacturing", "CAD/CAM"],
  "Civil Engineering": ["AutoCAD", "STAAD.Pro", "Revit", "Surveying", "Structural Analysis", "Quantity Estimation"],
  "Chemical Engineering": ["Aspen HYSYS", "Process Design", "Mass Transfer", "Heat Transfer", "Chemical Reaction Engineering"],
  Biotechnology: ["Bioinformatics", "Molecular Biology", "Genetic Engineering", "Bioprocess Engineering", "Cell Culture"],
};

const CANONICAL_SKILLS = new Map([
  ["javascript", "JavaScript"], ["js", "JavaScript"], ["nodejs", "Node.js"], ["node.js", "Node.js"],
  ["reactjs", "React"], ["react.js", "React"], ["dsa", "DSA"], ["sql", "SQL"], ["mongodb", "MongoDB"],
  ["matlab", "MATLAB"], ["simulink", "Simulink"], ["plc", "PLC"], ["scada", "SCADA"],
  ["autocad", "AutoCAD"], ["solidworks", "SolidWorks"], ["ansys", "ANSYS"], ["vlsi", "VLSI"],
]);

export function normalizeSkillName(value) {
  const trimmed = String(value || "").trim().replace(/\s+/g, " ");
  return CANONICAL_SKILLS.get(trimmed.toLowerCase()) || trimmed;
}

export function getSkillSuggestions(branch, targetRole) {
  const softwareTarget = /software|data|ai/i.test(targetRole || "") || /computer science|information technology/i.test(branch || "");
  return [...new Set([...(softwareTarget ? SOFTWARE_SKILLS : []), ...(BRANCH_SKILLS[branch] || [])])];
}
