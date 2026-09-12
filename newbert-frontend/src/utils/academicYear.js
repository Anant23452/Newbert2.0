export const academicBranches = [
  { id: "information-technology", code: "IT", name: "Information Technology", description: "From programming foundations to intelligent systems and cloud computing." },
  { id: "civil", code: "CE", name: "Civil Engineering", description: "From engineering mechanics to structures, transport and construction." },
  { id: "electrical", code: "EE", name: "Electrical Engineering", description: "From circuit fundamentals to machines, control and power systems." },
];

export function profileBranch(value = "") {
  if (/civil/i.test(value)) return "civil";
  if (/electrical|^ee$|^eee$/i.test(value)) return "electrical";
  if (/information|computer|^it$|^cse$|^csit$/i.test(value)) return "information-technology";
  return null;
}

// Four-year B.Tech; July is the academic-session boundary, not a claim about exam dates.
export function inferAcademicYear(graduationYear, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "numeric" }).formatToParts(now);
  const calendarYear = Number(parts.find(p => p.type === "year").value);
  const month = Number(parts.find(p => p.type === "month").value);
  const sessionStart = calendarYear - (month < 7 ? 1 : 0);
  const session = `${sessionStart}–${String(sessionStart + 1).slice(-2)}`;
  const graduating = Number(graduationYear);
  if (!Number.isInteger(graduating) || graduating < 2000 || graduating > 2100) return { year: null, status: "unknown", session, sessionStart };
  const year = sessionStart - (graduating - 4) + 1;
  return { year: year >= 1 && year <= 4 ? year : null, status: year > 4 ? "graduated" : year < 1 ? "future" : "current", session, sessionStart };
}

export function validYear(value) { const n = Number(value); return Number.isInteger(n) && n >= 1 && n <= 4 ? n : null; }
export function validSemester(value, year) { const n = Number(value); return [year * 2 - 1, year * 2].includes(n) ? n : year * 2 - 1; }
export const academicUnitKey = (branch, subject, unit) => `unit:${branch}:${subject}:${unit}`;
export const academicSubjectHref = (branch, subject, unit) => `/study/branch/${branch}/subject/${subject}${unit ? `?unit=${unit}` : ""}`;
