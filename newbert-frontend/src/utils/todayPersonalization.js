export const taskKey = (task) => `${task.planId}:${task.id}`;

export function recommendTask(tasks = [], minutes = 25) {
  // Input contains the first unfinished task in each plan, never skip prerequisites.
  return tasks.find((task) => task.estimatedMinutes > 0 && task.estimatedMinutes <= minutes) || tasks[0];
}

export function planTotals(plans = []) {
  return plans.reduce((sum, plan) => ({ completed: sum.completed + plan.completed, total: sum.total + plan.total }), { completed: 0, total: 0 });
}

export function deadlineLabel(deadline, now = Date.now()) {
  const left = new Date(deadline).getTime() - now;
  if (!Number.isFinite(left)) return "Check deadline";
  if (left <= 0) return "Deadline passed";
  if (left < 3600000) return "Less than 1 hour";
  if (left < 86400000) return `${Math.ceil(left / 3600000)}h left`;
  return `${Math.ceil(left / 86400000)} days left`;
}

export function readSaved(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

export function saveLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

export function restoreSession(saved, duration) {
  if (!saved || ![15, 25, 45].includes(saved.minutes) || !Number.isFinite(saved.remaining) || saved.remaining < 0 || saved.remaining > saved.minutes * 60 || (saved.running && !Number.isFinite(saved.deadline))) {
    return { minutes: duration, remaining: duration * 60, running: false, deadline: 0 };
  }
  const remaining = saved.running ? Math.min(saved.minutes * 60, Math.max(0, Math.ceil((saved.deadline - Date.now()) / 1000))) : saved.remaining;
  return { ...saved, remaining, running: Boolean(saved.running && remaining > 0) };
}
