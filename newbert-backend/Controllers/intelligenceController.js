const Profile = require("../Models/Profile");
const { calculateProfileReadiness } = require("../services/readinessService");
const { explainReadiness } = require("../services/readinessExplanationService");
const { normalizeStudentProfile } = require("../services/studentProfileNormalizationService");

exports.getMyReadiness = async (req, res, next) => {
  try {
    const profile = await Profile.findOne({ userId: req.auth.id }).lean();
    if (!profile) return res.status(404).json({ message: "Complete your profile before requesting readiness analysis." });
    const normalizedProfile = normalizeStudentProfile(profile);
    const analysis = calculateProfileReadiness(normalizedProfile);
    const aiExplanation = await explainReadiness(analysis);
    return res.json({
      ...analysis,
      aiExplanation,
      metadata: {
        analysisVersion: "1.0",
        benchmarkName: "Newbert curated readiness benchmarks",
        generatedAt: new Date().toISOString(),
        lastProfileSyncAt: normalizedProfile.lastSyncedAt,
      },
    });
  } catch (error) { return next(error); }
};
