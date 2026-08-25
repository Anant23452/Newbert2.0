const crypto = require("crypto");
const { findBestSeniorMatch, normalizeSkill } = require("./seniorMatchService");
const { calculateReadiness } = require("./readinessService");
const { normalizeTargetType } = require("./targetRequirementsService");

function cleanTarget(input = {}, profile = {}) {
  const type = normalizeTargetType(input.type, input.role || profile.targetRole);
  const role = String(input.role || profile.targetRole || (type === "core-placement" ? "Core Engineering" : "Software Developer")).trim();
  const weeklyHours = Math.min(60, Math.max(2, Number(input.weeklyHours) || 10));
  const deadline = input.deadline && !Number.isNaN(new Date(input.deadline).getTime()) ? new Date(input.deadline) : null;
  return { type, role, company: String(input.company || profile.targetCompany || "").trim() || null, deadline, weeklyHours, customGoal: String(input.customGoal || "").trim() || null };
}

function meaningfulSnapshot(profile, target) {
  const data = {
    branch: profile.branch || "",
    skills: (profile.skills || []).map((skill) => [normalizeSkill(skill.name || skill), Number(skill.score) || 0]).sort((a, b) => a[0].localeCompare(b[0])),
    projects: Number.isFinite(profile.projects) ? profile.projects : null,
    cgpa: Number.isFinite(profile.cgpa) ? profile.cgpa : null,
    leetcode: profile.leetcodeStats ? { username: profile.leetcodeStats.username, totalSolved: profile.leetcodeStats.totalSolved } : null,
    github: profile.githubStats ? { username: profile.githubStats.username, publicRepos: profile.githubStats.publicRepos } : null,
    target: { type: target.type, role: target.role, company: target.company, deadline: target.deadline, weeklyHours: target.weeklyHours },
  };
  const signature = crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
  return { ...data, signature, capturedAt: new Date() };
}

function selectSenior(profile, alumni, target) {
  const appropriate = alumni.filter((senior) => target.type === "gate" ? senior.outcomeType === "gate" : senior.outcomeType === "placement");
  const companyMatches = target.company ? appropriate.filter((senior) => senior.company?.toLowerCase() === target.company.toLowerCase()) : [];
  const wantedRole = normalizeSkill(target.role);
  const roleMatches = appropriate.filter((senior) => {
    const role = normalizeSkill(senior.role);
    return role.includes(wantedRole) || wantedRole.includes(role);
  });
  const pool = companyMatches.length ? companyMatches : roleMatches.length ? roleMatches : appropriate;
  return pool.length ? findBestSeniorMatch(profile, pool, target) : null;
}

function estimateTimeline(gaps, weeklyHours, deadline) {
  const work = gaps.filter((gap) => gap.status !== "Ready" && gap.status !== "Optional").reduce((sum, gap) => {
    const base = gap.priority === "high" ? 18 : gap.priority === "medium" ? 12 : 6;
    return sum + Math.max(3, Math.round(base * ((100 - gap.currentScore) / 100)));
  }, 12);
  let minWeeks = Math.max(5, Math.min(24, Math.ceil(work / weeklyHours)));
  let maxWeeks = Math.max(minWeeks, Math.min(28, Math.ceil(minWeeks * 1.25)));
  let deadlineConstrained = false;
  if (deadline) {
    const available = Math.max(1, Math.ceil((new Date(deadline) - Date.now()) / 604800000));
    deadlineConstrained = available < minWeeks;
    if (available > 0) maxWeeks = Math.min(maxWeeks, available);
  }
  if (maxWeeks < minWeeks) maxWeeks = minWeeks;
  return { minWeeks, maxWeeks, estimatedWeeks: Math.round((minWeeks + maxWeeks) / 2), deadlineConstrained, disclaimer: "Estimated from current gaps and available weekly hours; it is not a placement guarantee." };
}

function buildPhases(gaps, timeline, targetType) {
  const open = gaps.filter((gap) => gap.status !== "Ready" && gap.status !== "Optional");
  const phaseDefs = targetType === "gate"
    ? [["foundation", "Foundation", open.slice(0, 3)], ["core-practice", "Core Practice", open.slice(3)], ["mock-tests", "Mock Tests", []], ["revision", "Revision", []]]
    : [["foundation", "Foundation", open.filter((gap) => gap.priority === "high").slice(0, 3)], ["skill-gaps", "Skill Gaps", open.filter((gap) => !["projects"].includes(gap.type)).slice(3)], ["proof", "Projects & Proof", open.filter((gap) => gap.type === "projects")], ["interview", "Interview Preparation", []], ["applications", targetType === "internship" ? "Internship Applications" : "Applications", []]];
  const active = phaseDefs.filter(([, , goals], index) => goals.length || index >= phaseDefs.length - 2);
  const totalWeeks = timeline.estimatedWeeks;
  let cursor = 1;
  return active.map(([id, title, phaseGaps], index) => {
    const remainingPhases = active.length - index;
    const remainingWeeks = totalWeeks - cursor + 1;
    const length = index === active.length - 1 ? remainingWeeks : Math.max(1, Math.round(remainingWeeks / remainingPhases));
    const phase = { id, title, startWeek: cursor, endWeek: Math.min(totalWeeks, cursor + length - 1), goals: phaseGaps.length ? phaseGaps.map((gap) => gap.label) : [title === "Interview Preparation" ? "Practice target-role interviews and refine your resume" : "Apply to relevant opportunities and review outcomes"] };
    cursor = phase.endWeek + 1;
    return phase;
  });
}

function dateForOffset(days) {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function taskId(value) {
  return crypto.createHash("sha1").update(value.toLowerCase()).digest("hex").slice(0, 14);
}

function buildTasks(gaps, phases, existingTasks = []) {
  const prior = new Map(existingTasks.map((task) => [task.id, task]));
  const generated = [];
  const open = gaps.filter((gap) => gap.status !== "Ready" && gap.status !== "Optional");
  open.slice(0, 10).forEach((gap, index) => {
    const phase = phases.find((item) => item.goals.includes(gap.label)) || phases[Math.min(index, phases.length - 1)];
    const scheduledWeek = phase?.startWeek || 1;
    let title = `Build evidence for ${gap.label}`;
    let description = gap.detail;
    let verifiable = false;
    if (gap.type === "dsa") { title = `Complete a focused ${gap.label} practice set`; verifiable = true; description = `${gap.detail} Verify readiness changes through your connected profile when available.`; }
    if (gap.type === "projects") { title = "Complete one measurable project milestone"; verifiable = true; }
    if (gap.type.startsWith("skill")) title = `Study and practice ${gap.label}`;
    const id = taskId(`${phase?.id}-${gap.key}-${title}`);
    const old = prior.get(id);
    generated.push({ id, title, description, type: index < 4 ? "daily" : "weekly", phaseId: phase?.id || "foundation", scheduledWeek, scheduledDate: index < 4 ? dateForOffset(index) : null, verifiable, completed: Boolean(old?.completed), completedAt: old?.completedAt || null, archived: false });
  });
  const recurring = [
    { title: "Review this week's progress and update your evidence", phaseId: phases[0]?.id || "foundation", scheduledWeek: 1 },
    { title: "Practice target-role interview questions", phaseId: phases.at(-2)?.id || phases.at(-1)?.id || "interview", scheduledWeek: phases.at(-2)?.startWeek || 1 },
    { title: "Tailor your resume for one relevant opportunity", phaseId: phases.at(-1)?.id || "applications", scheduledWeek: phases.at(-1)?.startWeek || 1 },
  ];
  for (const item of recurring) {
    const id = taskId(`${item.phaseId}-${item.title}`);
    const old = prior.get(id);
    generated.push({ id, ...item, description: "Record the outcome in Newbert so your plan history stays useful.", type: "weekly", scheduledDate: null, verifiable: false, completed: Boolean(old?.completed), completedAt: old?.completedAt || null, archived: false });
  }
  const ids = new Set(generated.map((task) => task.id));
  const completedHistory = existingTasks.filter((task) => task.completed && !ids.has(task.id)).map((task) => ({ ...(task.toObject ? task.toObject() : task), archived: true }));
  return [...generated, ...completedHistory];
}

function calculateProgress(tasks) {
  const active = tasks.filter((task) => !task.archived);
  const completedTasks = active.filter((task) => task.completed).length;
  return { totalTasks: active.length, completedTasks, percent: active.length ? Math.round((completedTasks / active.length) * 100) : 0 };
}

function calculatePlanStreak(tasks) {
  const completedDates = new Set(tasks.filter((task) => task.completedAt).map((task) => new Date(task.completedAt).toISOString().slice(0, 10)));
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  if (!completedDates.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (completedDates.has(cursor.toISOString().slice(0, 10))) { streak += 1; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  return streak;
}

function buildPlan(profile, alumni, targetInput, existingPlan = null) {
  const target = cleanTarget(targetInput, profile);
  const seniorMatch = selectSenior(profile, alumni, target);
  const readiness = calculateReadiness(profile, target, seniorMatch, alumni);
  const timeline = estimateTimeline(readiness.gaps, target.weeklyHours, target.deadline);
  const phases = buildPhases(readiness.gaps, timeline, readiness.targetType);
  const tasks = buildTasks(readiness.gaps, phases, existingPlan?.tasks || []);
  return {
    userId: profile.userId,
    target,
    seniorMatch,
    readiness: { total: readiness.total, categories: readiness.categories },
    gaps: readiness.gaps,
    phases,
    tasks,
    timeline: { ...timeline, startDate: existingPlan?.timeline?.startDate || new Date() },
    progress: { ...calculateProgress(tasks), streak: calculatePlanStreak(tasks) },
    profileSnapshot: meaningfulSnapshot(profile, target),
    generationVersion: 1,
    lastCalculatedAt: new Date(),
  };
}

function needsRecalculation(plan, profile) {
  return meaningfulSnapshot(profile, plan.target).signature !== plan.profileSnapshot?.signature;
}

module.exports = { buildPlan, calculatePlanStreak, calculateProgress, cleanTarget, estimateTimeline, meaningfulSnapshot, needsRecalculation, selectSenior };
