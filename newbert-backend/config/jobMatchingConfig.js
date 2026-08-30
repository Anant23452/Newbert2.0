const IMPORTANCE_WEIGHTS = Object.freeze({ critical: 4, required: 3, preferred: 1, optional: 0.5 });
const STATUS_CREDIT = Object.freeze({ matched: 1, partial: 0.5, missing: 0 });

const COVERAGE_RULES = Object.freeze({
  minimumKnownWeightRatio: 0.5,
  applyNowOverall: 80,
  applyNowRequired: 80,
  withinReachOverall: 50,
  withinReachRequired: 60,
});

module.exports = { COVERAGE_RULES, IMPORTANCE_WEIGHTS, STATUS_CREDIT };
