const RESERVED_PATHS = new Set(["u", "profile", "problemset", "problems", "contest", "discuss"]);

function parseProfileUsername(value, platform) {
  if (typeof value !== "string" || !value.trim()) return "";
  const raw = value.trim().replace(/^@/, "");
  let parts;

  try {
    const candidate = /^https?:\/\//i.test(raw) ? raw : raw.includes(".com/") ? `https://${raw}` : null;
    if (!candidate) return validateUsername(raw, platform);
    const url = new URL(candidate);
    const expectedHost = platform === "github" ? "github.com" : "leetcode.com";
    if (url.hostname.replace(/^www\./, "").toLowerCase() !== expectedHost) throw new Error(`Enter a valid ${platform === "github" ? "GitHub" : "LeetCode"} profile URL or username.`);
    parts = url.pathname.split("/").filter(Boolean);
  } catch (error) {
    if (error.message.startsWith("Enter a valid")) throw error;
    throw new Error(`Enter a valid ${platform === "github" ? "GitHub" : "LeetCode"} profile URL or username.`);
  }

  if (platform === "leetcode" && ["u", "profile"].includes(parts[0]?.toLowerCase())) parts.shift();
  const username = parts[0] || "";
  return validateUsername(username, platform);
}

function validateUsername(username, platform) {
  const cleaned = decodeURIComponent(username || "").trim();
  if (!cleaned || RESERVED_PATHS.has(cleaned.toLowerCase())) throw new Error(`Enter a valid ${platform === "github" ? "GitHub" : "LeetCode"} username.`);
  const valid = platform === "github" ? /^(?!-)(?!.*--)[A-Za-z0-9-]{1,39}(?<!-)$/.test(cleaned) : /^[A-Za-z0-9_-]{1,50}$/.test(cleaned);
  if (!valid) throw new Error(`Enter a valid ${platform === "github" ? "GitHub" : "LeetCode"} username.`);
  return cleaned;
}

module.exports = { parseProfileUsername };
