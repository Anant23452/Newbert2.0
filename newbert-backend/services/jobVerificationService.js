const OFFICIAL_HOSTS = [/greenhouse\.io$/i, /lever\.co$/i, /ashbyhq\.com$/i, /myworkdayjobs\.com$/i];

function hostname(url) { try { return new URL(url).hostname; } catch { return ""; } }
function sourceType(url) { const host = hostname(url); return OFFICIAL_HOSTS.some((pattern) => pattern.test(host)) ? "trusted-ats" : host ? "official-company" : "unknown"; }
function verifyJob(job) {
  const now = new Date();
  const expired = job.expiresAt && new Date(job.expiresAt) < now;
  const applicationUrl = job.application?.officialUrl || job.applyUrl;
  const type = sourceType(applicationUrl);
  return { status: expired ? "expired" : type === "unknown" ? "pending" : type === "official-company" ? "verified" : "source_confirmed", sourceType: type, verifiedAt: type === "unknown" ? null : now, lastCheckedAt: now };
}
function refreshVerification(job) { return verifyJob(job); }
module.exports = { refreshVerification, verifyJob };
