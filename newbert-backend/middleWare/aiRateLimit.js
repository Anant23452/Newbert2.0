const WINDOW_MS = 60000;
const MAX_REQUESTS = 3;
const requestsByUser = new Map();

function removeExpired(now) {
  for (const [userId, entry] of requestsByUser) {
    if (entry.resetAt <= now) requestsByUser.delete(userId);
  }
}

function aiRateLimit(req, res, next) {
  const now = Date.now();
  removeExpired(now);

  const userId = String(req.auth.id);
  const current = requestsByUser.get(userId);
  const entry = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + WINDOW_MS }
    : current;

  if (entry.count >= MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({ success: false, message: "Please wait before requesting another AI insight." });
  }

  entry.count += 1;
  requestsByUser.set(userId, entry);
  return next();
}

module.exports = aiRateLimit;
