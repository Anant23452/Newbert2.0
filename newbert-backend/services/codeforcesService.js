const CF_API = 'https://codeforces.com/api';

async function cfJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Newbert' } });
    if (!res.ok) throw new Error(`Codeforces API returned ${res.status}.`);
    const payload = await res.json();
    if (payload.status !== 'OK') throw new Error(payload.comment || 'Codeforces request failed.');
    return payload.result;
  } finally { clearTimeout(timeout); }
}

async function getCodeforcesStats(username) {
  if (!username || typeof username !== 'string' || !username.trim()) throw new Error('Codeforces username is required.');
  const clean = username.trim().replace(/^@/, '');
  if (!/^[A-Za-z0-9._-]{1,50}$/.test(clean)) throw new Error('Enter a valid Codeforces username.');

  let user;
  try { [user] = await cfJson(`${CF_API}/user.info?handles=${encodeURIComponent(clean)}`); }
  catch (err) {
    if (/not found|no such/i.test(err.message)) throw new Error('Codeforces profile not found. Check the username and try again.');
    throw err;
  }
  if (!user) throw new Error('Codeforces profile not found. Check the username and try again.');

  let contests = [];
  try { contests = await cfJson(`${CF_API}/user.rating?handle=${encodeURIComponent(user.handle)}`); }
  catch { /* rating history unavailable for unrated users */ }

  return {
    username: user.handle,
    currentRating: user.rating ?? null,
    maxRating: user.maxRating ?? null,
    rank: user.rank ?? null,
    maxRank: user.maxRank ?? null,
    contestCount: Array.isArray(contests) ? contests.length : 0,
    contribution: user.contribution ?? 0,
    friendOfCount: user.friendOfCount ?? 0,
    avatar: user.avatar || user.titlePhoto || null,
    registrationTime: user.registrationTimeSeconds ? new Date(user.registrationTimeSeconds * 1000).toISOString() : null,
    lastSyncedAt: new Date().toISOString(),
  };
}

module.exports = { getCodeforcesStats };
