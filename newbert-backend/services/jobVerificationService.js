const OFFICIAL_HOSTS = [/greenhouse\.io$/i, /lever\.co$/i, /ashbyhq\.com$/i, /myworkdayjobs\.com$/i];

function hostname(url) { try { return new URL(url).hostname; } catch { return ""; } }
function sourceType(url) { const host = hostname(url); return OFFICIAL_HOSTS.some((pattern) => pattern.test(host)) ? "trusted-ats" : host ? "official-company" : "unknown"; }
function verifyJob(job) {
  const now = new Date();
  const expiryDate = job.expiresAt || job.application?.deadline || job.deadline || null;
  const expired = expiryDate && new Date(expiryDate) < now;
  const applicationUrl = job.application?.officialUrl || job.applyUrl;
  const type = sourceType(applicationUrl);
  const isLinkedInSource = /linkedin/i.test(String(job.source?.type || "")) || /linkedin\.com/i.test(String(applicationUrl || ""));
  return { status: expired ? "expired" : type === "unknown" ? "pending" : isLinkedInSource ? "source_confirmed" : type === "official-company" ? "verified" : "source_confirmed", sourceType: isLinkedInSource ? "linkedin" : type, verifiedAt: type === "unknown" ? null : now, lastCheckedAt: now };
}
function refreshVerification(job) { return verifyJob(job); }
module.exports = { refreshVerification, verifyJob };
