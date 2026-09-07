// Coverage is a transparent keyword check, never an ATS score or hiring probability.
export const RESUME_SKILLS = ["React", "Node.js", "JavaScript", "TypeScript", "Java", "Python", "SQL", "MongoDB", "MySQL", "PostgreSQL", "Git", "Docker", "AWS", "HTML", "CSS", "REST", "DSA", "Spring", "Excel", "AutoCAD", "MATLAB", "Revit", "SolidWorks", "Power BI", "C++", "C#", "Machine Learning", "Testing", "Linux"];
function contains(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, "i").test(text);
}
export function reviewResume(resume, description) {
  const required = RESUME_SKILLS.filter((skill) => contains(description, skill));
  const matched = required.filter((skill) => contains(resume, skill));
  const missing = required.filter((skill) => !matched.includes(skill));
  const lines = resume.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return { required, matched, missing, coverage: required.length ? Math.round(matched.length / required.length * 100) : null,
    evidenceLines: lines.filter((line) => matched.some((skill) => contains(line, skill))).slice(0, 6) };
}
