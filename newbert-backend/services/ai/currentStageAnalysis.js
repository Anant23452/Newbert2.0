const { generateAI } = require("./aiService");
const { buildCurrentStageAnalysisPrompt } = require("./prompts");

const KEYS = ["completed", "inProgress", "strengths", "weakAreas", "notStarted", "blockers", "target"];

function cleanAnalysis(value, fallback) {
  if (!value || typeof value !== "object") return fallback;
  const result = {};
  for (const key of KEYS) result[key] = [...new Set((Array.isArray(value[key]) ? value[key] : fallback[key] || []).map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 30);
  return result;
}

function parseAIJson(text) {
  const match = String(text || "").match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); }
  catch { return null; }
}

async function analyzeCurrentStage({ profile, target, selfAssessment, fallback }) {
  if (!process.env.GEMINI_API_KEY) return { analysis: fallback, source: "deterministic" };
  try {
    const text = await generateAI({ prompt: buildCurrentStageAnalysisPrompt({ profile, target, selfAssessment }), task: "current-stage-analysis", timeoutMs: 15000 });
    const parsed = parseAIJson(text);
    return { analysis: cleanAnalysis(parsed, fallback), source: parsed ? "gemini" : "deterministic" };
  } catch {
    return { analysis: fallback, source: "deterministic" };
  }
}

module.exports = { analyzeCurrentStage };
