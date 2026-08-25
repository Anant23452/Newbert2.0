const { GoogleGenAI } = require("@google/genai");

const DEFAULT_MODEL = "gemini-3.6-flash";
const DEFAULT_TIMEOUT_MS = 30000;

let client = null;
let clientApiKey = null;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const error = new Error("Gemini API key is not configured.");
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }

  if (!client || clientApiKey !== apiKey) {
    client = new GoogleGenAI({ apiKey });
    clientApiKey = apiKey;
  }

  return client;
}

async function generateText({ prompt, model, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const response = await getClient().models.generateContent({
    model: model || process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL,
    contents: prompt,
    config: {
      temperature: 0.2,
      httpOptions: { timeout: timeoutMs },
    },
  });

  const text = response?.text?.trim();
  if (!text) {
    const error = new Error("Gemini returned an empty response.");
    error.code = "AI_EMPTY_RESPONSE";
    throw error;
  }

  return text;
}

module.exports = { DEFAULT_MODEL, DEFAULT_TIMEOUT_MS, generateText };
