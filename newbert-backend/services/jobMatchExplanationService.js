const { generateAI } = require("./ai/aiService");
const { buildJobMatchExplanationPrompt } = require("./ai/prompts");

function deterministicJobExplanation(match) {
  const strongestMatches = match.requirementMatches.filter((item) => item.status === "matched").slice(0, 3).map((item) => item.skill);
  const importantGaps = match.requirementMatches.filter((item) => ["missing", "partial"].includes(item.status) && ["critical", "required"].includes(item.importance)).slice(0, 3).map((item) => item.skill);
  return {
    available: false,
    source: "deterministic_fallback",
    summary: match.coverage.overall.status === "available" ? `Newbert measured ${match.coverage.overall.value}% requirement coverage from the available JD and profile evidence.` : "Newbert does not have enough reliable JD and profile evidence to calculate requirement coverage.",
    bucketReason: match.bucketReason,
    strongestMatches,
    importantGaps,
    nextStep: match.learningDistance?.actions?.[0] || (match.bucket === "apply_now" ? "Review the official JD and tailor your application using only truthful evidence." : "Review unknown and missing evidence before prioritizing this application."),
  };
}

function parseJobExplanation(text, match) {
  const cleaned = String(text || "").trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(cleaned);
  const fields = ["summary", "bucketReason", "nextStep"];
  if (fields.some((field) => typeof parsed[field] !== "string" || !parsed[field].trim() || parsed[field].length > 1000)) throw new Error("Invalid job explanation.");
  const combined = fields.map((field) => parsed[field]).join(" ");
  if (/chance|probability|guaranteed|guarantee|will (?:get|receive|secure) (?:a |an )?(?:job|offer|placement|interview)/i.test(combined)) throw new Error("Unsafe job explanation claim.");
  const allowedPercentages = new Set([match.coverage.overall.value, match.coverage.required.value, match.coverage.preferred.value].filter(Number.isFinite));
  for (const found of combined.matchAll(/\b(\d{1,3})%/g)) if (!allowedPercentages.has(Number(found[1]))) throw new Error("Unsupported job-match percentage.");
  const allowedSkills = new Set(match.requirementMatches.map((item) => item.skill));
  const list = (value) => Array.isArray(value) ? value.map(String).filter((item) => allowedSkills.has(item)).slice(0, 3) : [];
  return { summary: parsed.summary.trim(), bucketReason: parsed.bucketReason.trim(), strongestMatches: list(parsed.strongestMatches), importantGaps: list(parsed.importantGaps), nextStep: parsed.nextStep.trim() };
}

async function explainJobMatch(match, options = {}) {
  const generate = options.generate || generateAI;
  const facts = {
    bucket: match.bucket,
    bucketReason: match.bucketReason,
    eligibility: match.eligibility,
    coverage: match.coverage,
    matchedRequirements: match.requirementMatches.filter((item) => item.status === "matched"),
    partialRequirements: match.requirementMatches.filter((item) => item.status === "partial"),
    missingRequirements: match.requirementMatches.filter((item) => item.status === "missing"),
    unknownRequirements: match.requirementMatches.filter((item) => item.status === "unknown"),
  };
  try {
    const text = await generate({ prompt: buildJobMatchExplanationPrompt(facts), task: "job-match-explanation", timeoutMs: 8000 });
    return { available: true, source: "gemini", ...parseJobExplanation(text, match) };
  } catch { return deterministicJobExplanation(match); }
}

module.exports = { deterministicJobExplanation, explainJobMatch, parseJobExplanation };
