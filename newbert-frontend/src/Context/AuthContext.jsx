import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import API, { AUTH_TOKEN_KEY } from "../Services/api";
import AuthContext from "./authContextValue";
import { createActivityRefresher } from "../utils/activityRefresh";

const PROFILE_KEY = "newbert-profile";

function readCachedProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null"); }
  catch { return null; }
}

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(readCachedProfile);
  const [user, setUser] = useState(() => {
    const cached = readCachedProfile();
    return cached ? { name: cached.name, email: cached.email, avatar: cached.avatar, isAdmin: Boolean(cached.isAdmin) } : null;
  });
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(AUTH_TOKEN_KEY)));
  const [error, setError] = useState("");
  const [syncState, setSyncState] = useState({ running: [], errors: {}, finished: false });
  const syncRequest = useRef(null);
  const profileRequest = useRef(null);
  const profileVersion = useRef(0);
  const latestProfile = useRef(profile);

  const storeProfile = useCallback((nextProfile) => {
    profileVersion.current += 1;
    latestProfile.current = nextProfile;
    setProfile(nextProfile);
    setUser((current) => ({ ...current, name: nextProfile.name, email: nextProfile.email, avatar: nextProfile.avatar, isAdmin: Boolean(nextProfile.isAdmin) }));
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile)); } catch { /* Account state remains available in memory. */ }
  }, []);

  const logout = useCallback(() => {
    profileVersion.current += 1;
    latestProfile.current = null;
    profileRequest.current?.controller.abort();
    profileRequest.current = null;
    syncRequest.current?.abort();
    syncRequest.current = null;
    setSyncState({ running: [], errors: {}, finished: false });
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
    setUser(null);
    setProfile(null);
    setError("");
    setLoading(false);
  }, []);

  const refreshProfile = useCallback((options = {}) => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      logout();
      return Promise.resolve(null);
    }
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (profileRequest.current?.token === token) return profileRequest.current.promise;
    const controller = new AbortController();
    const version = profileVersion.current;
    if (!options.silent) setLoading(true);
    setError("");
    const promise=(async()=>{
      try {
        const { data } = await API.get("/profiles/me", {signal:controller.signal,timeout:20000});
        if (token !== localStorage.getItem(AUTH_TOKEN_KEY)) return null;
        // A slow read must not overwrite a newer save or provider sync.
        if(version !== profileVersion.current) return latestProfile.current;
        storeProfile(data);
        return data;
      } catch (requestError) {
        if (requestError.code === 'ERR_CANCELED' || token !== localStorage.getItem(AUTH_TOKEN_KEY)) return null;
        setError(requestError.response?.data?.message || "Unable to refresh your profile. Your last saved activity is still available.");
        if (!options.silent) setProfile(null);
        if (requestError.response?.status === 401) logout();
        throw requestError;
      } finally {
        if(profileRequest.current?.controller===controller)profileRequest.current=null;
        if(token===localStorage.getItem(AUTH_TOKEN_KEY))setLoading(false);
      }
    })();
    profileRequest.current={token,controller,promise};
    return promise;
  }, [logout, storeProfile]);

  const syncProfile = useCallback(async (providers = ["github", "leetcode"], options = {}) => {
    if (syncRequest.current || !providers.length) return null;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;
    const controller = new AbortController();
    syncRequest.current = controller;
    const automatic=Boolean(options.automatic);
    setSyncState({ running: providers, errors: {}, finished: false, automatic });
    try {
      const { data } = await API.post("/profiles/sync", { providers, automatic }, { signal: controller.signal, timeout: 120000 });
      if (token !== localStorage.getItem(AUTH_TOKEN_KEY)) return null;
      storeProfile(data.profile);
      setSyncState({ running: [], errors: data.syncErrors || {}, finished: true, automatic });
      return data.profile;
    } catch (requestError) {
      if (requestError.code !== "ERR_CANCELED" && token === localStorage.getItem(AUTH_TOKEN_KEY)) {
        setSyncState({ running: [], errors: { general: requestError.response?.data?.message || "Your saved activity is available. Live activity could not be refreshed; please retry." }, finished: false, automatic });
      }
      return null;
    } finally {
      if (syncRequest.current === controller) syncRequest.current = null;
    }
  }, [storeProfile]);

  const refreshActivity = useMemo(()=>createActivityRefresher({
    getToken:()=>localStorage.getItem(AUTH_TOKEN_KEY),
    visible:()=>document.visibilityState==='visible' && navigator.onLine!==false,
    readProfile:()=>refreshProfile({silent:true}),
    syncProfile:providers=>syncProfile(providers,{automatic:true}),
  }),[refreshProfile,syncProfile]);

  const completeAuthentication = useCallback(async ({ token, user: authenticatedUser }) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    setUser(authenticatedUser);
    const restored = await refreshProfile();
    if (restored?.onboardingCompleted && restored.syncNeeded?.length) void syncProfile(restored.syncNeeded,{automatic:true});
    return restored;
  }, [refreshProfile, syncProfile]);

  const saveProfile = useCallback(async (updates) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const { data } = await API.put("/profiles/me", updates);
    if (token !== localStorage.getItem(AUTH_TOKEN_KEY)) return null;
    storeProfile(data);
    // Saving is durable first; provider outages must never hold onboarding hostage.
    if (data.syncNeeded?.length) void syncProfile(data.syncNeeded);
    return data;
  }, [storeProfile, syncProfile]);

  useEffect(() => {
    if (localStorage.getItem(AUTH_TOKEN_KEY)) refreshProfile().then((restored) => {
      if (restored?.onboardingCompleted && restored.syncNeeded?.length) void syncProfile(restored.syncNeeded,{automatic:true});
    }).catch(() => {});
    else setLoading(false);
  }, [refreshProfile, syncProfile]);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    error,
    isAuthenticated: Boolean(user && localStorage.getItem(AUTH_TOKEN_KEY)),
    onboardingCompleted: Boolean(profile?.onboardingCompleted),
    completeAuthentication,
    refreshProfile,
    refreshActivity,
    saveProfile,
    syncProfile,
    syncState,
    logout,
  }), [user, profile, loading, error, completeAuthentication, refreshProfile, refreshActivity, saveProfile, syncProfile, syncState, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
