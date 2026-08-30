// Newbert product weights. These are prioritization rules, not universal hiring rules.
const ROADMAP_PRIORITY_WEIGHTS = Object.freeze({
  CORE_ROLE_REQUIREMENT: 4,
  REQUIRED_TARGET_JOB: 4,
  HIGH_SEVERITY_AI01_GAP: 3,
  IMPORTANT_PREREQUISITE: 2,
  WEAK_OR_NO_EVIDENCE: 2,
  REQUIRED_ACROSS_MULTIPLE_JOBS: 2,
  PREFERRED_ONLY: 1,
});

const ROADMAP_PRIORITY_LEVELS = Object.freeze({ high: 6, medium: 3 });

module.exports = { ROADMAP_PRIORITY_LEVELS, ROADMAP_PRIORITY_WEIGHTS };
