import { useCallback, useEffect, useMemo, useState } from "react";
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

  const storeProfile = useCallback((nextProfile) => {
    setProfile(nextProfile);
    setUser((current) => ({ ...current, name: nextProfile.name, email: nextProfile.email, avatar: nextProfile.avatar }));
    localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
    setUser(null);
    setProfile(null);
    setError("");
    setLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      logout();
      return null;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/profiles/me");
      storeProfile(data);
      return data;
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to restore your profile.";
      setError(message);
      setProfile(null);
      if (requestError.response?.status === 401) logout();
      throw requestError;
    } finally {
      setLoading(false);
    }
  }, [logout, storeProfile]);

  const completeAuthentication = useCallback(async ({ token, user: authenticatedUser }) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    setUser(authenticatedUser);
    return refreshProfile();
  }, [refreshProfile]);

  const saveProfile = useCallback(async (updates) => {
    const { data } = await API.put("/profiles/me", updates);
    storeProfile(data);
    return data;
  }, [storeProfile]);

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
    logout,
  }), [user, profile, loading, error, completeAuthentication, refreshProfile, saveProfile, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
