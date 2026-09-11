export function readStudyLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
export function writeStudyLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
export function timeLabel(value = 0) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(seconds / 3600);
  return `${hours ? `${hours}:` : ""}${String(Math.floor(seconds / 60) % 60).padStart(hours ? 2 : 1, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
export function youtubeId(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const id = url.hostname === "youtu.be" ? url.pathname.slice(1) : ["www.youtube.com", "youtube.com", "m.youtube.com", "www.youtube-nocookie.com"].includes(url.hostname) ? url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)$/)?.[1] : null;
    return /^[A-Za-z0-9_-]{11}$/.test(id || "") ? id : null;
  } catch { return null; }
}
export function isReviewDue(record, now = Date.now()) {
  return Boolean(record?.reviewAt && new Date(record.reviewAt).getTime() <= now);
}
export function nextReview(confidence, now = Date.now()) {
  return new Date(now + ({ again: 0, good: 3, solid: 7 }[confidence] ?? 0) * 86400000).toISOString();
}
export function mergeStudySummaries(remote = [], local = []) {
  const records = new Map();
  for (const record of [...local, ...remote]) {
    if (!record?.key) continue;
    const previous = records.get(record.key);
    if (!previous || (Date.parse(record.lastViewedAt) || 0) >= (Date.parse(previous.lastViewedAt) || 0)) records.set(record.key, record);
  }
  return [...records.values()];
}
export function downloadText(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
