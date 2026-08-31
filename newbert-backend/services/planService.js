const crypto = require("crypto");
const { findBestSeniorMatch, normalizeSkill } = require("./seniorMatchService");
const { calculateProfileReadiness } = require("./readinessService");
const { normalizeStudentProfile } = require("./studentProfileNormalizationService");
const { normalizeTargetType } = require("./targetRequirementsService");
const { buildPrioritizedGaps } = require("./studentIntelligence/roadmapPriorityService");
const { buildRoadmapStructure } = require("./studentIntelligence/roadmapBuilderService");
const { nextBestAction } = require("./studentIntelligence/nextBestActionService");

function cleanTarget(input = {}, profile = {}) {
  const type = normalizeTargetType(input.type, input.role || profile.targetRole);
  const role = String(input.role || profile.targetRole || "").trim();
  const weeklyHours = Math.min(60, Math.max(2, Number(input.weeklyHours) || 10));
  const deadline = input.deadline && !Number.isNaN(new Date(input.deadline).getTime()) ? new Date(input.deadline) : null;
  const allowedStyles = ["balanced", "aggressive", "college-friendly", "revision-heavy", "practice-heavy"];
  const planStyle = allowedStyles.includes(input.planStyle) ? input.planStyle : "balanced";
  const jobIds = cleanList(input.jobIds || input.targetJobIds).slice(0, 5);
  const mode = input.mode === "job" || jobIds.length ? "job" : "role";
  return { mode, type, role, company: String(input.company || profile.targetCompany || "").trim() || null, jobIds, deadline, weeklyHours, planStyle, customGoal: String(input.customGoal || "").trim() || null };
}

function cleanList(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean))].slice(0, 30);
}

function splitTopics(value) {
  return String(value || "").split(/,|\band\b|\n|\.|;/i).map((item) => item.trim().replace(/^(the|most of)\s+/i, "")).filter((item) => item.length > 1 && item.length < 80).slice(0, 12);
}

function extractCurrentStage(selfAssessment = {}) {
  const story = String(selfAssessment.currentStageStory || "").trim().slice(0, 8000);
  const buckets = { completed: cleanList(selfAssessment.completedAreas), inProgress: [], strengths: [], weakAreas: [], notStarted: [], blockers: cleanList(selfAssessment.blockers), target: [] };
  const patterns = [
    ["completed", /(?:completed|finished|covered|done with)\s+([^.!\n]+)/gi],
    ["inProgress", /(?:working on|in progress|partially completed|around\s+\d+%\s+complete)\s+([^.!\n]+)/gi],
    ["weakAreas", /(?:weak in|weak at|struggle with|not confident in)\s+([^.!\n]+)/gi],
    ["notStarted", /(?:haven't started|have not started|not started)\s+([^.!\n]+)/gi],
    ["strengths", /(?:comfortable with|strong in|know)\s+([^.!\n]+)/gi],
    ["target", /(?:target is|target:|i want|my goal is|aiming for)\s+([^.!\n]+)/gi],
  ];
  for (const [bucket, expression] of patterns) {
    for (const match of story.matchAll(expression)) buckets[bucket].push(...splitTopics(match[1]));
  }
  for (const key of Object.keys(buckets)) buckets[key] = cleanList(buckets[key]);
  return buckets;
}

function topicMatches(label, topics) {
  const normalized = normalizeSkill(label);
  return topics.some((topic) => {
    const current = normalizeSkill(topic);
    return current && (normalized.includes(current) || current.includes(normalized));
  });
}

function applyCurrentStageToGaps(gaps, stage) {
  return gaps.map((gap) => {
    if (topicMatches(gap.label, stage.completed)) return { ...gap, currentScore: Math.max(gap.currentScore || 0, 80), status: "Ready", detail: `${gap.detail} Your current-stage note says this is already completed; keep it for revision, not beginner study.` };
    if (topicMatches(gap.label, stage.weakAreas) || topicMatches(gap.label, stage.notStarted)) return { ...gap, currentScore: Math.min(gap.currentScore || 0, 35), priority: "high", status: "Needs Improvement", detail: `${gap.detail} Your current-stage note identifies this as an active gap.` };
    return gap;
  });
}

function buildAIGuidance(gaps, tasks, stage) {
  const priorities = gaps.filter((gap) => gap.status !== "Ready" && gap.status !== "Optional").slice(0, 3).map((gap) => ({ title: gap.label, why: gap.detail }));
  const whatToAvoid = [];
  if (stage.completed.length) whatToAvoid.push(`Do not restart ${stage.completed.slice(0, 3).join(", ")} from beginner level. Reserve it for revision or targeted practice.`);
  if (stage.blockers.includes("Too many resources")) whatToAvoid.push("Do not switch between several resources. Finish one chosen source before adding another.");
  if (stage.blockers.includes("Lack of consistency")) whatToAvoid.push("Do not create an unrealistic daily schedule. Protect a smaller routine you can repeat.");
  return { topPriorities: priorities, whatToAvoid, nextSevenDays: tasks.filter((task) => !task.archived).slice(0, 7).map((task, index) => ({ day: index + 1, title: task.title, detail: task.description })) };
}

function meaningfulSnapshot(profile, target, selfAssessment = null, jobContexts = []) {
  const data = {
    branch: profile.branch || "",
    skills: (profile.skills || []).map((skill) => [normalizeSkill(skill.name || skill), Number(skill.score) || 0]).sort((a, b) => a[0].localeCompare(b[0])),
    projects: Number.isFinite(profile.projects) ? profile.projects : null,
    cgpa: Number.isFinite(profile.cgpa) ? profile.cgpa : null,
    leetcode: profile.leetcodeStats ? { username: profile.leetcodeStats.username, totalSolved: profile.leetcodeStats.totalSolved } : null,
    github: profile.githubStats ? { username: profile.githubStats.username, publicRepos: profile.githubStats.publicRepos } : null,
    target: { mode: target.mode, type: target.type, role: target.role, company: target.company, jobIds: cleanList(target.jobIds).sort(), deadline: target.deadline, weeklyHours: target.weeklyHours, planStyle: target.planStyle },
    targetJobs: jobContexts.map(({ job }) => ({ id: String(job._id || job.id), title: job.title, company: job.company, jdHash: job.jdAnalysis?.metadata?.rawJdHash || null, updatedAt: job.updatedAt || null })).sort((left, right) => left.id.localeCompare(right.id)),
    selfAssessment: selfAssessment || null,
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
  const completedTasks = active.filter((task) => task.status === "completed" || task.completed).length;
  const skippedTasks = active.filter((task) => task.status === "skipped").length;
  const inProgressTasks = active.filter((task) => task.status === "in_progress").length;
  const progressBase = Math.max(0, active.length - skippedTasks);
  return { totalTasks: active.length, completedTasks, skippedTasks, inProgressTasks, percent: progressBase ? Math.round((completedTasks / progressBase) * 100) : 0 };
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

function buildPlan(profile, alumni, targetInput, existingPlan = null, jobContexts = []) {
  const target = cleanTarget(targetInput, profile);
  const selfAssessment = {
    currentStageStory: String(targetInput.currentStageStory || existingPlan?.selfAssessment?.currentStageStory || "").trim().slice(0, 8000),
    blockers: cleanList(targetInput.blockers || existingPlan?.selfAssessment?.blockers),
    completedAreas: cleanList(targetInput.completedAreas || existingPlan?.selfAssessment?.completedAreas),
  };
  const understoodCurrentStage = targetInput.understoodCurrentStage && typeof targetInput.understoodCurrentStage === "object" ? {
    completed: cleanList(targetInput.understoodCurrentStage.completed), inProgress: cleanList(targetInput.understoodCurrentStage.inProgress), strengths: cleanList(targetInput.understoodCurrentStage.strengths), weakAreas: cleanList(targetInput.understoodCurrentStage.weakAreas), notStarted: cleanList(targetInput.understoodCurrentStage.notStarted), blockers: cleanList(targetInput.understoodCurrentStage.blockers || selfAssessment.blockers), target: cleanList(targetInput.understoodCurrentStage.target),
  } : extractCurrentStage(selfAssessment);
  const seniorMatch = selectSenior(profile, alumni, target);
  const normalizedProfile = normalizeStudentProfile({ ...profile, targetRole: target.role });
  normalizedProfile.goals.targetRole = target.role;
  const ai01 = calculateProfileReadiness(normalizedProfile);
  const prioritizedGaps = buildPrioritizedGaps({ ai01, jobContexts }).filter((gap) => !topicMatches(gap.item, understoodCurrentStage.completed));
  const roadmap = buildRoadmapStructure({ prioritizedGaps, normalizedProfile, existingTasks: existingPlan?.tasks || [] });
  const alumniSignals = existingPlan?.alumniSignals || [];
  const taskCategories = { dsa: ["dsa-interview"], projects: ["project-evidence"], development: ["core-skills", "project-evidence"], fundamentals: ["foundations"], subjects: ["foundations"], tests: ["dsa-interview", "application-readiness"], pyq: ["foundations", "dsa-interview"], revision: ["foundations"], duration: ["application-readiness"] };
  const tasks = roadmap.tasks.map((task) => {
    const evidence = alumniSignals.flatMap((signal) => (signal.supportedDimensions || []).filter((dimension) => (taskCategories[dimension.key] || []).includes(task.category)).map((dimension) => ({ source: "alumni_path", supported: true, alumniId: signal.alumniId, alumni: signal.alumniName, path: signal.path, detail: `${dimension.label}: your recorded value ${dimension.studentValue}; alumni recorded value ${dimension.alumniValue}.` })));
    return evidence.length ? { ...task, evidence: [...(task.evidence || []), ...evidence] } : task;
  });
  const phases = roadmap.phases;
  const compatibilityGaps = prioritizedGaps.map((gap) => ({ ...gap, key: gap.id, label: gap.item, detail: gap.reasons.join(" "), currentScore: 0, status: gap.priority === "high" ? "Needs Improvement" : "Developing", type: gap.category }));
  const timelineEstimate = estimateTimeline(compatibilityGaps, target.weeklyHours, target.deadline);
  const timeline = { ...timelineEstimate, estimatedWeeks: Math.max(timelineEstimate.estimatedWeeks, ...tasks.filter((task) => !task.archived).map((task) => task.scheduledWeek), 1) };
  const snapshot = meaningfulSnapshot(profile, target, selfAssessment, jobContexts);
  const meaningfulChange = !existingPlan || existingPlan.profileSnapshot?.signature !== snapshot.signature;
  const version = existingPlan ? Number(existingPlan.version || 1) + (meaningfulChange ? 1 : 0) : 1;
  const roadmapHistory = [...(existingPlan?.roadmapHistory || [])];
  if (existingPlan && meaningfulChange) roadmapHistory.push({ version: existingPlan.version || 1, analysisVersion: existingPlan.analysisVersion || "legacy", targetSnapshot: existingPlan.targetSnapshot || existingPlan.target, completedTaskIds: (existingPlan.tasks || []).filter((task) => task.completed || task.status === "completed").map((task) => task.id), skippedTaskIds: (existingPlan.tasks || []).filter((task) => task.status === "skipped").map((task) => task.id), retiredAt: new Date() });
  const coverageCategories = Object.fromEntries(Object.entries(ai01.coverage || {}).filter(([key, value]) => key !== "overall" && value.status === "available").map(([key, value]) => [key, value.value]));
  const targetSnapshot = { mode: target.mode, role: target.role, company: target.company, jobs: jobContexts.map(({ job }) => ({ id: String(job._id || job.id), title: job.title, company: job.company })) };
  const action = nextBestAction(tasks);
  return {
    userId: profile.userId,
    target,
    seniorMatch,
    alumniSignals,
    readiness: { total: ai01.coverage?.overall?.value ?? null, categories: coverageCategories },
    dataConfidence: ai01.dataConfidence,
    gaps: compatibilityGaps,
    prioritizedGaps,
    phases,
    tasks,
    nextBestAction: action,
    timeline: { ...timeline, startDate: existingPlan?.timeline?.startDate || new Date() },
    progress: { ...calculateProgress(tasks), streak: calculatePlanStreak(tasks) },
    profileSnapshot: snapshot,
    selfAssessment,
    understoodCurrentStage,
    aiGuidance: { topPriorities: prioritizedGaps.slice(0, 3).map((gap) => ({ title: gap.item, why: gap.reasons.join(" ") })), whatToAvoid: understoodCurrentStage.completed.length ? [`Do not restart ${understoodCurrentStage.completed.slice(0, 3).join(", ")} from beginner level.`] : [], nextSevenDays: tasks.filter((task) => !task.archived).slice(0, 7).map((task, index) => ({ day: index + 1, title: task.title, detail: task.description })) },
    version,
    analysisVersion: "AI-03.1",
    targetSnapshot,
    roadmapHistory: roadmapHistory.slice(-10),
    generationVersion: 3,
    lastCalculatedAt: new Date(),
  };
}

function needsRecalculation(plan, profile, jobContexts = []) {
  return meaningfulSnapshot(profile, plan.target, plan.selfAssessment, jobContexts).signature !== plan.profileSnapshot?.signature;
}

module.exports = { applyCurrentStageToGaps, buildPlan, calculatePlanStreak, calculateProgress, cleanTarget, estimateTimeline, extractCurrentStage, meaningfulSnapshot, needsRecalculation, selectSenior };
