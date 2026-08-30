const Plan = require("../Models/Plan");
const Profile = require("../Models/Profile");
const { generateAI } = require("../services/ai/aiService");
const { TEST_MESSAGE, buildTestPrompt } = require("../services/ai/prompts");
const { explainRoadmap, explanationText } = require("../services/roadmapExplanationService");

function sendAIError(res, error, operation) {
  const code = error?.code || "AI_PROVIDER_ERROR";
  const status = Number(error?.status) || 503;
  console.error(`[Newbert AI:${operation}]`, { code, status });
  return res.status(status).json({ success: false, message: error?.publicMessage || "Newbert AI is temporarily unavailable. Please try again." });
}

exports.testAI = async (req, res) => {
  try {
    await generateAI({ prompt: buildTestPrompt(), task: "integration-test" });
    return res.json({ success: true, message: TEST_MESSAGE });
  } catch (error) {
    return sendAIError(res, error, "test");
  }
};

exports.explainPlan = async (req, res) => {
  try {
    const [profile, plan] = await Promise.all([
      Profile.findOne({ userId: req.auth.id }).lean(),
      Plan.findOne({ userId: req.auth.id }).lean(),
    ]);

    if (!profile) return res.status(404).json({ success: false, message: "Complete your profile before requesting an AI insight." });
    if (!plan) return res.status(404).json({ success: false, message: "Build your plan first." });

    const result = await explainRoadmap(plan);
    return res.json({ success: true, explanation: explanationText(result), explanationData: result, source: result.source });
  } catch (error) {
    return sendAIError(res, error, "plan-explanation");
  }
};
