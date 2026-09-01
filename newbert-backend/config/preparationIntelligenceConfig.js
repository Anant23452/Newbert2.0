// Product prioritization rules. These values order roadmap work; they are not
// hiring probabilities and must never be displayed as placement confidence.
const TARGET_IMPORTANCE_POINTS = Object.freeze({ critical: 4, high: 3, medium: 2, low: 0 });
const GAP_POINTS = Object.freeze({ target_gap: 4, knowledge_gap: 3, evidence_gap: 2 });
const EVIDENCE_CONFIDENCE_POINTS = Object.freeze({ high: 2, medium: 1, low: 0 });
const SENIOR_SUPPORT_POINTS = Object.freeze({ common: 2, present: 1, none: 0 });

const PRIORITY_BANDS = Object.freeze({ high: 8, medium: 4 });

module.exports = { EVIDENCE_CONFIDENCE_POINTS, GAP_POINTS, PRIORITY_BANDS, SENIOR_SUPPORT_POINTS, TARGET_IMPORTANCE_POINTS };
