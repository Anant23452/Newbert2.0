const { generateText } = require("./geminiProvider");

class AIServiceError extends Error {
  constructor(code, publicMessage, status = 503) {
    super(publicMessage);
    this.name = "AIServiceError";
    this.code = code;
    this.publicMessage = publicMessage;
    this.status = status;
  }
}

function normalizeProviderError(error) {
  if (error instanceof AIServiceError) return error;

  const status = Number(error?.status || error?.statusCode || error?.response?.status || (Number.isFinite(Number(error?.code)) ? error.code : 0));
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();

  if (code === "AI_NOT_CONFIGURED") {
    return new AIServiceError("AI_NOT_CONFIGURED", "Newbert AI is not configured yet.");
  }
  if (code === "AI_EMPTY_RESPONSE") {
    return new AIServiceError("AI_EMPTY_RESPONSE", "Newbert AI returned no explanation. Please try again.");
  }
  if (status === 429 || message.includes("quota") || message.includes("rate limit")) {
    return new AIServiceError("AI_PROVIDER_LIMIT", "Newbert AI is busy right now. Please try again shortly.", 429);
  }
  if (code.includes("TIMEOUT") || code.includes("ABORT") || error?.name === "AbortError" || message.includes("timeout") || message.includes("timed out") || message.includes("aborted")) {
    return new AIServiceError("AI_TIMEOUT", "Newbert AI took too long to respond. Please try again.", 504);
  }
  if (status === 401 || status === 403 || message.includes("api key")) {
    return new AIServiceError("AI_PROVIDER_AUTH", "Newbert AI is temporarily unavailable.");
  }
  if (status === 404 && message.includes("model")) {
    return new AIServiceError("AI_MODEL_UNAVAILABLE", "Newbert AI is temporarily unavailable.");
  }
  if (message.includes('location') && (message.includes('not supported') || message.includes('unsupported'))) {
    return new AIServiceError('AI_REGION_UNAVAILABLE', 'Gemini is not available from the backend region.');
  }
  if (status === 400) return new AIServiceError('AI_INVALID_REQUEST', 'Gemini rejected the request configuration.');
  if (status === 503 || status === 500) return new AIServiceError('AI_PROVIDER_BUSY', 'Gemini is temporarily busy. Please retry shortly.');

  return new AIServiceError("AI_PROVIDER_ERROR", "Newbert AI is temporarily unavailable. Please try again.");
}

async function generateAI({ prompt, model, timeoutMs, responseJsonSchema, videoUrl, json }) {
  if (!prompt || typeof prompt !== "string") {
    throw new AIServiceError("AI_INVALID_PROMPT", "Newbert AI could not prepare this request.", 500);
  }

  try {
    return await generateText({ prompt, model, timeoutMs, responseJsonSchema, videoUrl, json });
  } catch (error) {
    const normalized = normalizeProviderError(error);
    console.error('[Newbert AI:provider]', {code:normalized.code,providerStatus:Number(error?.status || error?.statusCode || error?.response?.status || (Number.isFinite(Number(error?.code)) ? error.code : 0)),model:model || process.env.GEMINI_MODEL?.trim() || 'default'});
    throw normalized;
  }
}

module.exports = { AIServiceError, generateAI, normalizeProviderError };
