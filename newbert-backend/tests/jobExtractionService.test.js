const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeRawJobPost, deterministicJdFallback, mergeAdminRequirements, normalizeStructuredAnalysis } = require("../services/jobJdAnalysisService");
const { buildStructuredJobExtractionPrompt } = require("../services/ai/prompts");

const completeJd = `Acme Labs is hiring a Machine Learning Intern in Bengaluru, Karnataka, India.
This is a remote internship for students graduating in 2026 or 2027 with B.Tech in CSE or IT and a minimum CGPA of 7.5.
The internship lasts 6 months and pays an INR 25000 monthly stipend with PPO available.
Python and scikit-learn are required. Docker is preferred. Strong data structures knowledge is required.
Candidates will build recommendation models and deploy model APIs.
Apply before 2026-10-31 at https://careers.acme.example/jobs/ml-intern.`;

function completeAiValue() {
  return {
    basic: { companyName: "Acme Labs", jobTitle: "Machine Learning Intern", department: "Machine Learning", roleCategory: "Machine Learning", employmentType: "internship", workMode: "remote", location: { city: "Bengaluru", state: "Karnataka", country: "India", raw: "Bengaluru, Karnataka, India" }, multipleLocations: [], experienceLevel: "intern", experience: { minYears: null, maxYears: null } },
    compensation: { type: "stipend", currency: "INR", minAmount: 25000, maxAmount: 25000, period: "monthly", ppoAvailable: true, bonus: null, equity: null },
    dates: { postedDate: null, applicationDeadline: "2026-10-31", joiningDate: null, internshipDuration: { value: 6, unit: "months" } },
    eligibility: { degrees: ["B.Tech"], branches: ["CSE", "IT"], graduationYears: [2026, 2027], minimumCgpa: 7.5, maximumCgpa: null, backlogPolicy: null, workAuthorization: null, locationRestrictions: [], otherEligibility: [] },
    requirements: [
      { label: "Python", canonicalSkill: "python", category: "technical", importance: "required", evidenceText: "Python and scikit-learn are required.", confidence: "high" },
      { label: "scikit-learn", canonicalSkill: "scikit-learn", category: "technical", importance: "required", evidenceText: "Python and scikit-learn are required.", confidence: "high" },
      { label: "Docker", canonicalSkill: "docker", category: "technical", importance: "preferred", evidenceText: "Docker is preferred.", confidence: "high" },
      { label: "Data Structures", canonicalSkill: "data structures", category: "cs-fundamental", importance: "required", evidenceText: "Strong data structures knowledge is required.", confidence: "high" },
    ],
    responsibilities: ["build recommendation models", "deploy model APIs"], qualifications: [], projectExpectations: [], selectionProcess: [], benefits: [], companyDescription: null, applicationInstructions: "Apply before 2026-10-31 at https://careers.acme.example/jobs/ml-intern.",
    application: { officialApplyUrl: "https://careers.acme.example/jobs/ml-intern", sourceUrl: null },
    fieldEvidence: [
      { field: "basic.companyName", evidenceText: "Acme Labs is hiring a Machine Learning Intern in Bengaluru, Karnataka, India.", confidence: "high" },
      { field: "basic.jobTitle", evidenceText: "Acme Labs is hiring a Machine Learning Intern in Bengaluru, Karnataka, India.", confidence: "high" },
      { field: "basic.location", evidenceText: "Acme Labs is hiring a Machine Learning Intern in Bengaluru, Karnataka, India.", confidence: "high" },
      { field: "basic.employmentType", evidenceText: "This is a remote internship for students graduating in 2026 or 2027 with B.Tech in CSE or IT and a minimum CGPA of 7.5.", confidence: "high" },
      { field: "basic.workMode", evidenceText: "This is a remote internship for students graduating in 2026 or 2027 with B.Tech in CSE or IT and a minimum CGPA of 7.5.", confidence: "high" },
      { field: "basic.experienceLevel", evidenceText: "This is a remote internship for students graduating in 2026 or 2027 with B.Tech in CSE or IT and a minimum CGPA of 7.5.", confidence: "medium" },
      { field: "compensation", evidenceText: "The internship lasts 6 months and pays an INR 25000 monthly stipend with PPO available.", confidence: "high" },
      { field: "dates.applicationDeadline", evidenceText: "Apply before 2026-10-31 at https://careers.acme.example/jobs/ml-intern.", confidence: "high" },
      { field: "dates.internshipDuration", evidenceText: "The internship lasts 6 months and pays an INR 25000 monthly stipend with PPO available.", confidence: "high" },
      { field: "eligibility.degrees", evidenceText: "This is a remote internship for students graduating in 2026 or 2027 with B.Tech in CSE or IT and a minimum CGPA of 7.5.", confidence: "high" },
      { field: "eligibility.branches", evidenceText: "This is a remote internship for students graduating in 2026 or 2027 with B.Tech in CSE or IT and a minimum CGPA of 7.5.", confidence: "high" },
      { field: "eligibility.graduationYears", evidenceText: "This is a remote internship for students graduating in 2026 or 2027 with B.Tech in CSE or IT and a minimum CGPA of 7.5.", confidence: "high" },
      { field: "eligibility.minimumCgpa", evidenceText: "This is a remote internship for students graduating in 2026 or 2027 with B.Tech in CSE or IT and a minimum CGPA of 7.5.", confidence: "high" },
      { field: "application.officialApplyUrl", evidenceText: "Apply before 2026-10-31 at https://careers.acme.example/jobs/ml-intern.", confidence: "high" },
    ],
  };
}

test("comprehensive AI extraction keeps structured ML internship facts", async () => {
  const result = await analyzeRawJobPost(completeJd, { generate: async () => JSON.stringify(completeAiValue()) });
  assert.equal(result.source, "gemini");
  assert.equal(result.data.company, "Acme Labs");
  assert.equal(result.data.workMode, "remote");
  assert.equal(result.data.compensation.minAmount, 25000);
  assert.equal(result.data.eligibility.minimumCgpa, 7.5);
  assert.equal(result.data.internshipDuration.value, 6);
  assert.ok(result.data.requiredSkills.includes("Python"));
  assert.ok(result.data.preferredSkills.includes("Docker"));
});

test("missing salary and CGPA remain null instead of being invented", () => {
  const analysis = deterministicJdFallback({ title: "Frontend Engineer", description: "React is required. Work remotely from India." });
  assert.equal(analysis.compensation.minAmount, null);
  assert.equal(analysis.compensation.maxAmount, null);
  assert.equal(analysis.eligibility.minimumCgpa, null);
  assert.equal(analysis.basic.workMode, "remote");
});

test("preferred Docker stays preferred and unmentioned Java is absent", () => {
  const analysis = deterministicJdFallback({ title: "Backend Engineer", description: "Node.js is required. Docker is preferred." });
  assert.equal(analysis.requirements.find((item) => item.canonicalSkill === "docker")?.importance, "preferred");
  assert.equal(analysis.requirements.some((item) => item.canonicalSkill === "java"), false);
});

test("multiple locations require explicit source evidence", () => {
  const raw = "Analyst roles are open in Noida, Uttar Pradesh and Bengaluru, Karnataka.";
  const analysis = normalizeStructuredAnalysis({ basic: { multipleLocations: [{ city: "Noida", state: "Uttar Pradesh", country: "India", raw: "Noida, Uttar Pradesh" }, { city: "Bengaluru", state: "Karnataka", country: "India", raw: "Bengaluru, Karnataka" }] }, fieldEvidence: [{ field: "basic.multipleLocations", evidenceText: raw, confidence: "high" }] }, { description: raw }, "gemini");
  assert.equal(analysis.basic.multipleLocations.length, 2);
});

test("AI failure returns deterministic draft and honest warning", async () => {
  const result = await analyzeRawJobPost("Example is hiring a React Developer. React is required. Apply at https://example.com/careers/react.", { generate: async () => { throw new Error("offline"); } });
  assert.equal(result.source, "deterministic");
  assert.equal(result.data.aiAnalysisAvailable, false);
  assert.match(result.data.analysisWarning, /could not be completed/i);
  assert.ok(result.data.requiredSkills.includes("React"));
});

test("reviewed admin requirements override refreshed AI values", () => {
  const refreshed = deterministicJdFallback({ title: "Engineer", description: "React is required. Minimum CGPA is 8.0." });
  const merged = mergeAdminRequirements(refreshed, { requiredSkills: ["TypeScript"], preferredSkills: [], criticalSkills: [], optionalSkills: [], csFundamentals: [], minimumCgpa: 7.25, allowedBranches: ["IT"], graduationYears: [2027] }, { title: "Engineer", company: "Example", description: "React is required. Minimum CGPA is 8.0." });
  assert.deepEqual(merged.requiredSkills, ["TypeScript"]);
  assert.equal(merged.eligibility.minimumCgpa, 7.25);
  assert.deepEqual(merged.eligibility.branches, ["IT"]);
});

test("extraction prompt explicitly forbids guessing and requests exact evidence", () => {
  const prompt = buildStructuredJobExtractionPrompt({ rawText: "Sample JD" });
  assert.match(prompt, /Do not infer or guess/i);
  assert.match(prompt, /exact excerpt/i);
  assert.match(prompt, /multipleLocations/);
  assert.match(prompt, /projectExpectations/);
});
