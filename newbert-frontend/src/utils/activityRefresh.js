export const ACTIVITY_CHANGED = 'newbert:activity-changed';
export const PROFILE_POLL_MS = 60000;
export const PROFILE_REFRESH_GAP_MS = 30000;
export const PROVIDER_RETRY_GAP_MS = 120000;

// A single coordinator coalesces focus, route, timer and mutation events for one account.
export function createActivityRefresher({ getToken, readProfile, syncProfile, visible = () => true, now = Date.now }) {
  let scope = null;
  let lastRead = -Infinity;
  let lastSync = -Infinity;
  let active = null;
  let queued = false;
  async function refresh({ changed = false } = {}) {
    const token = getToken();
    if (!token || !visible()) return null;
    if (scope !== token) { scope=token; lastRead=-Infinity; lastSync=-Infinity; active=null; queued=false; }
    if (active) { if(changed)queued=true; return active; }
    if (!changed && now()-lastRead<PROFILE_REFRESH_GAP_MS) return null;
    lastRead=now();
    const operation=(async()=>{
      try {
        const profile=await readProfile();
        if(getToken()!==token)return null;
        if(profile?.onboardingCompleted && profile.syncNeeded?.length && now()-lastSync>=PROVIDER_RETRY_GAP_MS){
          lastSync=now();
          return await syncProfile(profile.syncNeeded) || profile;
        }
        return profile;
      } catch { return null; }
    })();
    active=operation;
    try {return await operation;}
    finally {
      if(active===operation){
        active=null;
        if(queued&&getToken()===token){queued=false;void refresh({changed:true});}
      }
    }
  }
  return refresh;
}

export function changesStudentActivity(config = {}) {
  if (!['post','put','patch','delete'].includes(String(config.method).toLowerCase())) return false;
  const route = String(config.url || '').split('?')[0];
  return /^\/(?:projects|plans|improvement-plans)(?:\/|$)/.test(route)
    || /^\/profiles\/(?:learning-progress|privacy|me)$/.test(route);
}
