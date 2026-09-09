function buildTodaySummary({ plans = [], savedJobs = [], studies = [], now = new Date() }) {
  const recent = now.getTime() - 7 * 86400000;
  const tasks = plans.flatMap((plan) => (plan.tasks || []).map((task) => ({
    id: task.id, title: task.title, description: task.description, estimatedMinutes: task.estimatedMinutes,
    completed: task.completed, completedAt: task.completedAt, order: task.order,
    planId: String(plan._id), skillName: plan.skillName, planStatus: plan.status,
  })));
  const upcoming = savedJobs.map((entry) => ({ ...entry, jobId: entry.jobId ? { ...entry.jobId, deadline: entry.jobId.application?.deadline || entry.jobId.deadline } : null })).filter((entry) => {
    const job = entry.jobId;
    return job && job.active !== false && job.verification?.status === "verified" &&
      ["saved", "planning"].includes(entry.status) && job.deadline && new Date(job.deadline) >= now && (!job.expiresAt || new Date(job.expiresAt) >= now);
  }).sort((a, b) => new Date(a.jobId.deadline) - new Date(b.jobId.deadline)).slice(0, 3).map(({ jobId: job }) => ({
    id: String(job._id), title: job.title, company: job.company, deadline: job.deadline,
  }));
  return {
    generatedAt: now.toISOString(),
    tasks: tasks.filter((task) => !task.completed && !["verified", "evidence_submitted"].includes(task.planStatus)).sort((a, b) => a.order - b.order).slice(0, 3),
    completedThisWeek: tasks.filter((task) => task.completed && task.completedAt && new Date(task.completedAt).getTime() >= recent && new Date(task.completedAt) <= now).length,
    activePlans: plans.filter((plan) => plan.status !== "verified").length,
    upcoming,
    applications: savedJobs.filter((job) => ["applied", "interview", "offer"].includes(job.status)).length,
    continueStudying: studies.find((study) => !study.completed) || null,
    awaitingReview: plans.filter((plan) => plan.status === "evidence_submitted").length,
  };
}
module.exports = { buildTodaySummary };
