const indiaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });

export function activityWeek(calendar = [], now = new Date()) {
  const parts = Object.fromEntries(indiaDate.formatToParts(now).map(({ type, value }) => [type, value]));
  const midnight = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00+05:30`);
  const indexed = new Map((Array.isArray(calendar) ? calendar : []).filter(Boolean).map((day) => [day.date, day]));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(midnight.getTime() - (6 - index) * 86400000);
    const values = Object.fromEntries(indiaDate.formatToParts(date).map(({ type, value }) => [type, value]));
    const key = `${values.year}-${values.month}-${values.day}`;
    const source = indexed.get(key);
    const count = (value) => Math.max(0, Number(value) || 0);
    // Use API-normalized metrics only, never self-entered profile totals.
    const github = count(source?.githubCommits);
    const leetcode = count(source?.leetcodeAccepted);
    return { key, github, leetcode, total: github + leetcode, recorded: Boolean(source),
      label: date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short" }),
      dateLabel: date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }),
    };
  });
}
