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
    deterministicGaps: sourcePlan.gaps || [],
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
      title: phase.title,
      startWeek: phase.startWeek,
      endWeek: phase.endWeek,
      goals: phase.goals || [],
    })),
    progress: sourcePlan.progress || null,
  };

  return `You are Newbert AI, a careful career-plan explainer for a student.\n\nThe JSON below contains server-calculated facts. You must explain them; do not calculate, alter, replace, or second-guess any score, percentage, match, ranking, timeline, or gap.\n\nRules:\n- Use only facts present in the JSON. Never invent achievements, senior data, skills, activity, companies, probabilities, or guarantees.\n- Treat missing GitHub, LeetCode, senior-match, CGPA, project, or skill data as unavailable. Do not treat unavailable data as a weakness unless the deterministic gaps explicitly do so.\n- Clearly distinguish factual observations from your suggested next actions.\n- Do not claim that the student will get a job, placement, interview, or offer.\n- Keep the answer concise and professional: a short overview, the three highest-priority actions, and one encouraging closing sentence.\n- Use plain text only. Do not use HTML, tables, or JSON in the answer.\n- Preserve every numeric value exactly as supplied.\n\nServer facts:\n${JSON.stringify(facts)}`;
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
  return `Extract only explicitly stated job requirements from this job description. Return valid JSON only: {"requiredSkills":[],"preferredSkills":[],"csFundamentals":[],"minimumCgpa":null,"allowedBranches":[],"graduationYears":[],"experienceLevel":"unspecified","responsibilities":[]}. Never infer a skill, CGPA, branch, year, or experience level that is not stated.\n\nTitle: ${title}\nCompany: ${company}\nDescription:\n${description}`;
}

function buildRawJobPostPrompt(rawText) {
  return `You are Newbert Job Extraction AI. Convert this noisy raw job post into valid JSON only. Extract only explicit facts. Ignore tracking IDs, SVG/image URLs, UI labels, and unrelated metadata. Prefer an explicitly stated official apply URL over LinkedIn. Never decide verification or a student match. Use null for unavailable scalar values and [] for unavailable lists. Shape: {"title":null,"company":null,"location":{"city":null,"state":null,"country":null,"raw":null},"workMode":null,"employmentType":null,"experienceLevel":null,"education":[],"requiredSkills":[],"preferredSkills":[],"generalSkills":[],"csFundamentals":[],"responsibilities":[],"summary":null,"salary":null,"deadline":null,"postedText":null,"applicantText":null,"hiringActivity":null,"officialApplyUrl":null,"contact":{"email":null,"phone":null,"whatsapp":null},"source":{"detectedProvider":"unknown","linkedinJobId":null,"linkedinJobUrl":null,"sourceUrl":null}}\n\nRaw post:\n${rawText}`;
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
  return buildFeaturePrompt("a job-match explanation", facts, "Explain server-provided matching signals without calculating a new score or implying an application outcome.");
}

function buildResumeImprovementPrompt(facts) {
  return buildFeaturePrompt("resume improvement suggestions", facts, "Never invent experience, metrics, credentials, employers, projects, or achievements. Suggest placeholders when evidence is missing.");
}

module.exports = {
  TEST_MESSAGE,
  buildInterviewPracticePrompt,
  buildJobMatchExplanationPrompt,
  buildPlanExplanationPrompt,
  buildCurrentStageAnalysisPrompt,
  buildJobDescriptionPrompt,
  buildRawJobPostPrompt,
  buildResumeImprovementPrompt,
  buildSeniorMatchExplanationPrompt,
  buildTestPrompt,
};
