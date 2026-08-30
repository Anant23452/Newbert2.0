const { generateAI } = require("./ai/aiService");
const { buildReadinessExplanationPrompt } = require("./ai/prompts");

function buildDeterministicExplanation(analysis) {
  if (!analysis.targetRole?.supported) {
    return {
      available: false,
      source: "deterministic_fallback",
      summary: analysis.targetRole ? `${analysis.targetRole.label} is not supported by AI-01 yet. Choose one of the four supported software roles for role-specific coverage.` : "Choose a target role to receive role-specific readiness analysis.",
      nextActionExplanation: "Your existing profile remains available; no readiness percentage is shown without a supported target.",
    };
  }
  if (analysis.coverage.overall.status !== "available") {
    return {
      available: false,
      source: "deterministic_fallback",
      summary: `More profile data is required for a reliable ${analysis.targetRole.label} readiness analysis.`,
      nextActionExplanation: analysis.dataConfidence.missingSources.length ? `Add or sync ${analysis.dataConfidence.missingSources.slice(0, 2).map((source) => source.label).join(" and ")} to improve analysis confidence.` : "Add more truthful profile evidence to unlock coverage.",
    };
  }
  const categories = Object.values(analysis.coverage).filter((category) => category.status === "available" && category.label);
  const strongest = categories.sort((left, right) => right.value - left.value)[0];
  const priority = analysis.priorities[0];
  return {
    available: false,
    source: "deterministic_fallback",
    summary: `Your current ${analysis.targetRole.label} readiness coverage is ${analysis.coverage.overall.value}% based on available evidence${strongest ? `; ${strongest.label} is the strongest currently measured category` : ""}.`,
    nextActionExplanation: priority ? `${priority.item} is the first deterministic priority: ${priority.recommendedAction}` : "No high-priority evidence gap was detected in the categories Newbert can currently measure.",
  };
}

function parseExplanation(text, analysis) {
  const cleaned = String(text || "").trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(cleaned);
  if (typeof parsed.summary !== "string" || typeof parsed.nextActionExplanation !== "string") throw new Error("Invalid readiness explanation shape.");
  if (!parsed.summary.trim() || !parsed.nextActionExplanation.trim() || parsed.summary.length > 1000 || parsed.nextActionExplanation.length > 1000) throw new Error("Invalid readiness explanation content.");
  const combined = `${parsed.summary} ${parsed.nextActionExplanation}`;
  if (/placement probability|chance of placement|guaranteed|guarantee|will (?:get|receive|secure) (?:a |an )?(?:job|offer|placement|interview)/i.test(combined)) throw new Error("Unsafe readiness explanation claim.");
  const allowedPercentages = new Set(Object.values(analysis.coverage).filter((category) => category.status === "available").map((category) => Number(category.value)));
  for (const match of combined.matchAll(/\b(\d{1,3})%/g)) if (!allowedPercentages.has(Number(match[1]))) throw new Error("Unsupported readiness percentage.");
  return { summary: parsed.summary.trim(), nextActionExplanation: parsed.nextActionExplanation.trim() };
}

async function explainReadiness(analysis, options = {}) {
  const generate = options.generate || generateAI;
  try {
    const text = await generate({ prompt: buildReadinessExplanationPrompt(analysis), task: "profile-readiness-explanation", timeoutMs: 8000 });
    return { available: true, source: "gemini", ...parseExplanation(text, analysis) };
  } catch {
    return buildDeterministicExplanation(analysis);
  }
}

module.exports = { buildDeterministicExplanation, explainReadiness, parseExplanation };
