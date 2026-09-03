// ─────────────────────────────────────────────────────────────────────────────
// IST (Asia/Kolkata, UTC+5:30) DATE NORMALIZATION UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

const KOLKATA_TIMEZONE = "Asia/Kolkata";

/**
 * Canonical helper to normalize any timestamp, Date object, or ISO string
 * to YYYY-MM-DD in the given timezone (defaults to Asia/Kolkata / IST).
 */
function toActivityDate(value = new Date(), timezone = KOLKATA_TIMEZONE) {
  if (!value) return "";
  const tz = timezone || KOLKATA_TIMEZONE;
  const d = typeof value === "string" || typeof value === "number" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";

  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return `${map.year}-${map.month}-${map.day}`;
  } catch {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: KOLKATA_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }
}

/**
 * Normalizes any valid timestamp, Date object, or ISO string to YYYY-MM-DD in Asia/Kolkata time.
 * If input is invalid or falsy, returns empty string.
 */
function kolkataDate(value = new Date()) {
  return toActivityDate(value, KOLKATA_TIMEZONE);
}

/**
 * Returns current calendar day in Asia/Kolkata (YYYY-MM-DD).
 */
function getKolkataToday(timezone = KOLKATA_TIMEZONE) {
  return toActivityDate(new Date(), timezone);
}

/**
 * Returns date in Asia/Kolkata shifted by offsetDays (e.g. -1 for yesterday).
 */
function getKolkataDayOffset(offsetDays = 0, baseDate = new Date()) {
  const base = kolkataDate(baseDate);
  if (!base) return "";
  const [year, month, day] = base.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + Number(offsetDays || 0))).toISOString().slice(0, 10);
}

/**
 * Returns a Set of YYYY-MM-DD date strings for the specified range in Asia/Kolkata.
 * - "today": [today] (1 day)
 * - "7d": [today, today-1, ... today-6] (7 days)
 * - "30d": [today, today-1, ... today-29] (30 days)
 * - "overall" / null: returns null (all time)
 */
function getDatesForRange(range = "7d", baseDate = new Date()) {
  if (range === "overall" || !range) return null;
  const length = range === "today" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : 0;
  if (length <= 0) return null;

  const dates = new Set();
  for (let i = 0; i < length; i += 1) {
    dates.add(getKolkataDayOffset(-i, baseDate));
  }
  return dates;
}

/**
 * Checks if two date instances/strings fall on the exact same calendar day in Asia/Kolkata.
 */
function isSameDayIST(d1, d2) {
  const s1 = kolkataDate(d1);
  const s2 = kolkataDate(d2);
  return Boolean(s1 && s2 && s1 === s2);
}

/**
 * Decrements a YYYY-MM-DD string by 1 calendar day.
 */
function previousKolkataDay(dateString) {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return "";
  const [year, month, day] = dateString.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day - 1));
  return d.toISOString().slice(0, 10);
}

/**
 * Canonical streak calculation for Newbert.
 * Calculates both current and longest consecutive active calendar days (in IST).
 * Active day = verified GitHub activity/commits or LeetCode activity/accepted problems.
 */
function calculateStreaks(activity = []) {
  const activeDays = (Array.isArray(activity) ? activity : []).filter((day) => {
    const total = Number(day.total) || 0;
    const github = Number(day.github) || 0;
    const githubCommits = Number(day.githubCommits) || 0;
    const leetcode = Number(day.leetcode) || 0;
    const leetcodeAccepted = Number(day.leetcodeAccepted) || (Array.isArray(day.leetcodeAcceptedProblems) ? day.leetcodeAcceptedProblems.length : 0);
    return total > 0 || github > 0 || githubCommits > 0 || leetcode > 0 || leetcodeAccepted > 0;
  });

  const activeDates = new Set(activeDays.map((day) => kolkataDate(day.date) || day.date).filter(Boolean));

  let longestStreak = 0;
  let running = 0;
  let previous = null;
  for (const date of [...activeDates].sort()) {
    const current = new Date(`${date}T00:00:00Z`);
    running = previous && current - previous === 86400000 ? running + 1 : 1;
    longestStreak = Math.max(longestStreak, running);
    previous = current;
  }

  let cursor = getKolkataToday();
  if (!activeDates.has(cursor)) {
    cursor = previousKolkataDay(cursor);
  }

  let currentStreak = 0;
  while (cursor && activeDates.has(cursor)) {
    currentStreak += 1;
    cursor = previousKolkataDay(cursor);
  }

  return { currentStreak, longestStreak };
}

/**
 * Returns current streak for an activity calendar.
 */
function getCurrentStreak(activity = []) {
  return calculateStreaks(activity).currentStreak;
}

module.exports = {
  KOLKATA_TIMEZONE,
  toActivityDate,
  kolkataDate,
  getKolkataToday,
  getKolkataDayOffset,
  getDatesForRange,
  isSameDayIST,
  previousKolkataDay,
  calculateStreaks,
  getCurrentStreak,
};
