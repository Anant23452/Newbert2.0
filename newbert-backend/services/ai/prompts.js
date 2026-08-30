const TEST_MESSAGE = "Newbert Gemini integration is working.";

function asPlainObject(value) {
  if (!value) return null;
  return value.toObject ? value.toObject() : value;
}

function buildTestPrompt() {
  return `Reply with exactly this sentence and nothing else:\n${TEST_MESSAGE}`;
}

function buildPlanExplanationPrompt({ profile, plan }) {
  const sourceProfile = asPlainObject(profile) || {};
  const sourcePlan = asPlainObject(plan) || {};
  const snapshot = sourcePlan.profileSnapshot || {};
  const match = sourcePlan.seniorMatch || null;

  const facts = {
    student: {
      college: sourceProfile.college || null,
      branch: sourceProfile.branch || null,
      graduationYear: sourceProfile.graduationYear || null,
      savedSkills: (sourceProfile.skills || []).map((skill) => ({ name: skill.name, score: skill.score ?? null })),
      projects: sourceProfile.projects ?? snapshot.projects ?? null,
      cgpa: sourceProfile.cgpa ?? snapshot.cgpa ?? null,
      github: snapshot.github ? { connected: true, publicRepos: snapshot.github.publicRepos ?? null } : null,
      leetcode: snapshot.leetcode ? { connected: true, totalSolved: snapshot.leetcode.totalSolved ?? null } : null,
    },
    target: sourcePlan.target ? {
      type: sourcePlan.target.type,
      role: sourcePlan.target.role,
      company: sourcePlan.target.company || null,
      deadline: sourcePlan.target.deadline || null,
      weeklyHours: sourcePlan.target.weeklyHours,
      customGoal: sourcePlan.target.customGoal || null,
    } : null,
    deterministicReadiness: sourcePlan.readiness || null,
    dataConfidence: sourcePlan.dataConfidence || null,
    prioritizedGaps: (sourcePlan.prioritizedGaps || []).map((gap) => ({ id: gap.id, item: gap.item, priorityScore: gap.priorityScore, priority: gap.priority, reasons: gap.reasons })),
    nextBestAction: sourcePlan.nextBestAction || null,
    deterministicSeniorMatch: match ? {
      score: match.score,
      senior: match.senior ? {
        name: match.senior.name,
        college: match.senior.college,
        company: match.senior.company,
        role: match.senior.role,
        package: match.senior.package ?? null,
      } : null,
      matchedSkills: match.matchedSkills || [],
      missingSkills: match.missingSkills || [],
      comparison: match.comparison || null,
    } : null,
    phases: (sourcePlan.phases || []).map((phase) => ({
      id: phase.id,
      title: phase.title,
      startWeek: phase.startWeek,
      endWeek: phase.endWeek,
      goals: phase.goals || [],
    })),
    progress: sourcePlan.progress || null,
  };

  return `You are Newbert AI, a careful explainer of a deterministic student roadmap.\n\nThe server facts are authoritative. You may explain them, but you must not create roadmap content.\n\nRules:\n- Use only facts present in the JSON. Never introduce a skill, tool, task, phase, target-job requirement, achievement, company, score, timeline, probability, or guarantee.\n- Do not reorder tasks or gaps and do not change any priority score.\n- The nextBestAction was selected by the server. Explain why it matters using only its supplied why and evidence fields.\n- Missing data is unknown, not weakness and not zero.\n- Do not claim that the student will get a job, placement, interview, or offer.\n- Return valid JSON only: {"summary":"","nextActionExplanation":"","phaseDescriptions":[{"phaseId":"","description":""}]}.\n- Use only supplied phase IDs. Keep each description concise. Preserve every numeric value exactly.\n\nServer facts:\n${JSON.stringify(facts)}`;
}

function buildReadinessExplanationPrompt(analysis) {
  const facts = {
    targetRole: analysis.targetRole,
    dataConfidence: analysis.dataConfidence,
    coverage: analysis.coverage,
    strengths: analysis.strengths,
    gaps: analysis.gaps,
    priorities: analysis.priorities,
    limitations: {
      coverageIsNotPlacementProbability: true,
      leetcodeTopicDataAvailable: false,
      githubSkillVerificationIsLimitedToSuppliedEvidence: true,
      projectQualityVerified: false,
    },
  };
  return `You are Newbert AI, a careful explainer of a deterministic student-readiness analysis.

The server facts below are authoritative. Follow every rule:
- Explain only the supplied target, coverage, confidence, strengths, gaps, priorities, and limitations.
- Never calculate, alter, replace, round, or invent a score, percentage, skill, project, LeetCode topic, GitHub claim, gap, priority, employer outcome, or placement probability.
- Coverage means coverage of Newbert's current curated benchmark. It is not a hiring prediction.
- Missing or unavailable data is unknown, not zero and not evidence of weakness.
- Do not claim that GitHub verifies a framework unless that exact claim is present in the facts.
- Do not promise an interview, placement, offer, or company decision.
- Return valid JSON only with this exact shape: {"summary":"","nextActionExplanation":""}.
- Keep each value concise, plain text, and suitable for a student profile.

Server facts:
${JSON.stringify(facts)}`;
}

function buildCurrentStageAnalysisPrompt({ profile, target, selfAssessment }) {
  const facts = {
    profile: {
      branch: profile.branch || null,
      skills: (profile.skills || []).map((skill) => skill.name || skill),
      projects: Number.isFinite(profile.projects) ? profile.projects : null,
      cgpa: Number.isFinite(profile.cgpa) ? profile.cgpa : null,
      github: profile.githubStats ? { connected: true, repositories: profile.githubStats.publicRepos ?? null, languages: profile.githubStats.languages || [] } : null,
      leetcode: profile.leetcodeStats ? { connected: true, solved: profile.leetcodeStats.totalSolved ?? null } : null,
    },
    goal: target,
    selfAssessment,
  };
  return `You are Newbert AI. Extract only what the student explicitly states from the supplied facts. Respect the selected goal: software placement, GATE, core placement, internship, data/AI, government/PSU, or custom. Do not invent completion, scores, companies, experience, or dates. Return valid JSON only with this exact shape: {"completed":[],"inProgress":[],"strengths":[],"weakAreas":[],"notStarted":[],"blockers":[],"target":[]}. Use concise topic names.\n\nFacts:\n${JSON.stringify(facts)}`;
}

function buildJobDescriptionPrompt({ title, company, description }) {
  return buildStructuredJobExtractionPrompt({ title, company, rawText: description });
}

function buildStructuredJobExtractionPrompt({ title = null, company = null, rawText }) {
  return `You are Newbert Job Description Extraction AI. Convert the supplied job description into valid JSON only.

NON-NEGOTIABLE RULES:
- Extract only facts explicitly present in the supplied text. If a value is absent, return null, "unknown", or [] exactly as the schema requires.
- Do not infer or guess any missing fact.
- Never fill missing information using role knowledge, company knowledge, typical salaries, likely locations, or common technology stacks.
- Never decide job verification, student eligibility, requirement coverage, readiness, hiring probability, interview probability, or placement probability.
- Ignore tracking IDs, image/SVG URLs, page controls, applicant counts, promoted labels, and unrelated page metadata.
- Every non-null important field must have a matching fieldEvidence item containing a short exact excerpt copied from the supplied text.
- Every requirement must have a short exact evidenceText excerpt. Do not output a requirement without provenance.
- Use confidence "high" only for direct unambiguous wording, "medium" for clear but less precise wording, and "low" for uncertain wording.
- Classify requirement importance only from wording: must/mandatory/essential can be critical; required/strong knowledge/proficiency is required; preferred/good to have is preferred; nice to have/bonus/plus is optional.
- Do not promote preferred or optional skills to required.
- Location must contain only geography. Work mode, posted time, applicants, and hiring activity are separate.
- Use ISO YYYY-MM-DD dates only when an explicit calendar date is supplied. Do not convert relative dates such as "3 days ago" into a calendar date.
- Compensation numbers must contain digits only in JSON. Preserve the stated currency and period.

Allowed enums:
employmentType = full-time | part-time | internship | contract | apprenticeship | temporary | unknown
workMode = onsite | hybrid | remote | unknown
experienceLevel = intern | entry-level | junior | mid | senior | unspecified
compensation.type = salary | stipend | unknown
compensation.period = hourly | monthly | yearly | total | unknown
requirement.importance = critical | required | preferred | optional
requirement.category = technical | cs-fundamental | tool | framework | cloud | database | soft-skill | domain | other
confidence = high | medium | low

Return exactly this JSON shape:
{
  "basic": {
    "companyName": null,
    "jobTitle": null,
    "department": null,
    "roleCategory": null,
    "employmentType": "unknown",
    "workMode": "unknown",
    "location": {"city": null, "state": null, "country": null, "raw": null},
    "multipleLocations": [],
    "experienceLevel": "unspecified",
    "experience": {"minYears": null, "maxYears": null}
  },
  "compensation": {"type":"unknown","currency":null,"minAmount":null,"maxAmount":null,"period":"unknown","ppoAvailable":null,"bonus":null,"equity":null},
  "dates": {"postedDate":null,"applicationDeadline":null,"joiningDate":null,"internshipDuration":{"value":null,"unit":null}},
  "eligibility": {"degrees":[],"branches":[],"graduationYears":[],"minimumCgpa":null,"maximumCgpa":null,"backlogPolicy":null,"workAuthorization":null,"locationRestrictions":[],"otherEligibility":[]},
  "requirements": [{"canonicalSkill":"","label":"","category":"technical","importance":"required","evidenceText":"","confidence":"medium"}],
  "responsibilities":[],
  "qualifications":[],
  "csFundamentals":[],
  "projectExpectations":[],
  "selectionProcess":[],
  "benefits":[],
  "companyDescription":null,
  "applicationInstructions":null,
  "application":{"officialApplyUrl":null,"sourceUrl":null},
  "fieldEvidence":[{"field":"basic.workMode","evidenceText":"Remote role","confidence":"high"}],
  "source":{"detectedProvider":"unknown","linkedinJobId":null,"linkedinJobUrl":null},
  "contact":{"email":null,"phone":null,"whatsapp":null},
  "postedText":null,
  "applicantText":null,
  "hiringActivity":null
}

Known title supplied by admin: ${title || "not supplied"}
Known company supplied by admin: ${company || "not supplied"}

JOB DESCRIPTION:
${rawText}`;
}

function buildRawJobPostPrompt(rawText) {
  return buildStructuredJobExtractionPrompt({ rawText });
}

function buildFeaturePrompt(feature, facts, specificRules) {
  return `You are Newbert AI preparing ${feature}. Use only the supplied server facts. Never invent personal data, scores, evidence, outcomes, or guarantees. Clearly label suggestions as suggestions. ${specificRules}\n\nServer facts:\n${JSON.stringify(facts || {})}`;
}

function buildSeniorMatchExplanationPrompt(facts) {
  return buildFeaturePrompt("a senior-match explanation", facts, "Explain deterministic matches and gaps without changing the match score or ranking.");
}

function buildInterviewPracticePrompt(facts) {
  return buildFeaturePrompt("interview practice", facts, "State that the questions are AI-generated practice material, not questions from a real employer or guaranteed interview coverage.");
}

function buildJobMatchExplanationPrompt(facts) {
  return `You are Newbert AI explaining an already-completed deterministic job match.

Use only the supplied server facts. You must not:
- change or calculate the eligibility result, requirement coverage, counts, or readiness bucket;
- invent a JD requirement, student skill, evidence source, gap, or eligibility condition;
- predict recruiter behavior, hiring, interview, placement, or offer probability;
- promise an interview or offer;
- treat unknown information as missing.

Return valid JSON only with this exact shape:
{"summary":"","bucketReason":"","strongestMatches":[],"importantGaps":[],"nextStep":""}

Keep the explanation concise. Coverage means coverage of the saved explicit JD requirements, not hiring probability.

Server facts:
${JSON.stringify(facts || {})}`;
}

function buildResumeImprovementPrompt(facts) {
  return buildFeaturePrompt("resume improvement suggestions", facts, "Never invent experience, metrics, credentials, employers, projects, or achievements. Suggest placeholders when evidence is missing.");
}

module.exports = {
  TEST_MESSAGE,
  buildInterviewPracticePrompt,
  buildJobMatchExplanationPrompt,
  buildPlanExplanationPrompt,
  buildReadinessExplanationPrompt,
  buildCurrentStageAnalysisPrompt,
  buildJobDescriptionPrompt,
  buildRawJobPostPrompt,
  buildStructuredJobExtractionPrompt,
  buildResumeImprovementPrompt,
  buildSeniorMatchExplanationPrompt,
  buildTestPrompt,
};
