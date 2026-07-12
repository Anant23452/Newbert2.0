const STORAGE_KEY = "newbert-saved-jobs";

export function getSavedJobs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveJob(job) {
  const saved = getSavedJobs();
  if (!saved.some((item) => item.title === job.title)) {
    saved.unshift({ ...job, status: "Saved", savedAt: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }
  return getSavedJobs();
}

export function updateJobStatus(title, status) {
  const saved = getSavedJobs().map((job) => job.title === title ? { ...job, status } : job);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  return saved;
}
