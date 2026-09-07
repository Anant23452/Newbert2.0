import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import API, { AUTH_TOKEN_KEY } from "../Services/api";
import AuthContext from "./authContextValue";

const PROFILE_KEY = "newbert-profile";

function readCachedProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null"); }
  catch { return null; }
}

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(readCachedProfile);
  const [user, setUser] = useState(() => {
    const cached = readCachedProfile();
    return cached ? { name: cached.name, email: cached.email, avatar: cached.avatar } : null;
  });
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(AUTH_TOKEN_KEY)));
  const [error, setError] = useState("");
  const [syncState, setSyncState] = useState({ running: [], errors: {}, finished: false });
  const syncRequest = useRef(null);

  const storeProfile = useCallback((nextProfile) => {
    setProfile(nextProfile);
    setUser((current) => ({ ...current, name: nextProfile.name, email: nextProfile.email, avatar: nextProfile.avatar }));
    localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
  }, []);

  const logout = useCallback(() => {
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

  const refreshProfile = useCallback(async (options = {}) => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      logout();
      return null;
    }
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!options.silent) setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/profiles/me");
      if (token !== localStorage.getItem(AUTH_TOKEN_KEY)) return null;
      storeProfile(data);
      return data;
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to restore your profile.";
      setError(message);
      if (!options.silent) setProfile(null);
      if (requestError.response?.status === 401) logout();
      throw requestError;
    } finally {
      setLoading(false);
    }
  }, [logout, storeProfile]);

  const syncProfile = useCallback(async (providers = ["github", "leetcode"]) => {
    if (syncRequest.current || !providers.length) return null;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;
    const controller = new AbortController();
    syncRequest.current = controller;
    setSyncState({ running: providers, errors: {}, finished: false });
    try {
      const { data } = await API.post("/profiles/sync", { providers }, { signal: controller.signal, timeout: 120000 });
      if (token !== localStorage.getItem(AUTH_TOKEN_KEY)) return null;
      storeProfile(data.profile);
      setSyncState({ running: [], errors: data.syncErrors || {}, finished: true });
      return data.profile;
    } catch (requestError) {
      if (requestError.code !== "ERR_CANCELED" && token === localStorage.getItem(AUTH_TOKEN_KEY)) {
        setSyncState({ running: [], errors: { general: requestError.response?.data?.message || "Your profile is saved. Account data could not be refreshed; please retry." }, finished: false });
      }
      return null;
    } finally {
      if (syncRequest.current === controller) syncRequest.current = null;
    }
  }, [storeProfile]);

  const completeAuthentication = useCallback(async ({ token, user: authenticatedUser }) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    setUser(authenticatedUser);
    return refreshProfile();
  }, [refreshProfile]);

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
    if (localStorage.getItem(AUTH_TOKEN_KEY)) refreshProfile().catch(() => {});
    else setLoading(false);
  }, [refreshProfile]);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    error,
    isAuthenticated: Boolean(user && localStorage.getItem(AUTH_TOKEN_KEY)),
    onboardingCompleted: Boolean(profile?.onboardingCompleted),
    completeAuthentication,
    refreshProfile,
    saveProfile,
    syncProfile,
    syncState,
    logout,
  }), [user, profile, loading, error, completeAuthentication, refreshProfile, saveProfile, syncProfile, syncState, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
