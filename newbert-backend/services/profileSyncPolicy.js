const SYNC_STALE_MS = 6 * 60 * 60 * 1000;

function providersNeedingSync(profile, now = Date.now()) {
  return ["github", "leetcode"].filter((provider) => {
    if (!profile?.[`${provider}Username`] && !profile?.[`${provider}Url`]) return false;
    const updatedAt = profile.evidenceCache?.[provider]?.updatedAt || profile.lastSyncedAt;
    return !profile[`${provider}Stats`] || !updatedAt || now - new Date(updatedAt).getTime() >= SYNC_STALE_MS;
  });
}

function manualSkills(requested, existing) {
  const stored = new Map(existing.map((s) => [s.name.toLowerCase(), s]));
  return requested.map((skill) => {
    const previous = stored.get(skill.name.toLowerCase());
    return { name: skill.name, score: previous?.score || 0, source: previous?.source || "manual" };
  });
}

module.exports = { providersNeedingSync, manualSkills, SYNC_STALE_MS };
