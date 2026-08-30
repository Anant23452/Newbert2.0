const { generateAI } = require("./ai/aiService");
const { buildPlanExplanationPrompt } = require("./ai/prompts");

function fallbackExplanation(plan) {
  const action = plan.nextBestAction;
  const confidence = plan.dataConfidence?.level || "low";
  const summary = `This ${plan.target?.mode === "job" ? "job" : "role"} roadmap uses your current evidence and the selected ${plan.target?.role || "target"}. Data confidence is ${confidence}.`;
  const next = action ? `${action.action} is next because ${(action.why || []).join(" ")}` : "No open evidence-backed task remains. Refresh after your profile evidence changes.";
  return { source: "deterministic_fallback", summary, nextActionExplanation: next, phaseDescriptions: (plan.phases || []).map((phase) => ({ phaseId: phase.id, description: `${phase.title} contains only currently relevant deterministic tasks.` })) };
}

function parseExplanation(value, plan) {
  const cleaned = String(value || "").trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(cleaned);
  if (typeof parsed.summary !== "string" || typeof parsed.nextActionExplanation !== "string" || !Array.isArray(parsed.phaseDescriptions)) throw new Error("Invalid roadmap explanation shape.");
  const combined = `${parsed.summary} ${parsed.nextActionExplanation} ${parsed.phaseDescriptions.map((item) => item.description).join(" ")}`;
  if (!parsed.summary.trim() || !parsed.nextActionExplanation.trim() || combined.length > 5000) throw new Error("Invalid roadmap explanation content.");
  if (/placement probability|chance of placement|guaranteed|guarantee|will (?:get|receive|secure) (?:a |an )?(?:job|offer|placement|interview)/i.test(combined)) throw new Error("Unsafe roadmap claim.");
  const allowedPercentages = new Set([plan.readiness?.total].filter(Number.isFinite).map(Number));
  for (const match of combined.matchAll(/\b(\d{1,3})%/g)) if (!allowedPercentages.has(Number(match[1]))) throw new Error("Unsupported roadmap percentage.");
  const phaseIds = new Set((plan.phases || []).map((phase) => phase.id));
  const phaseDescriptions = parsed.phaseDescriptions.filter((item) => phaseIds.has(item?.phaseId) && typeof item.description === "string").map((item) => ({ phaseId: item.phaseId, description: item.description.trim().slice(0, 500) }));
  return { source: "gemini", summary: parsed.summary.trim().slice(0, 1500), nextActionExplanation: parsed.nextActionExplanation.trim().slice(0, 1500), phaseDescriptions };
}

async function explainRoadmap(plan, options = {}) {
  const generate = options.generate || generateAI;
  try { return parseExplanation(await generate({ prompt: buildPlanExplanationPrompt({ plan }), task: "roadmap-explanation", timeoutMs: 8000 }), plan); }
  catch { return fallbackExplanation(plan); }
}

function explanationText(explanation) {
  return [explanation.summary, explanation.nextActionExplanation, ...explanation.phaseDescriptions.map((phase) => phase.description)].filter(Boolean).join("\n\n");
}

module.exports = { explainRoadmap, explanationText, fallbackExplanation, parseExplanation };
