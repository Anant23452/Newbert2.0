import { useCallback, useEffect, useRef, useState } from "react";
import API from "../Services/api";
import useAuth from "./useAuth";

const GUEST_KEY = "newbert-guest-study-progress";
export default function useStudyProgress() {
  const { isAuthenticated, profile } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const scope = isAuthenticated ? profile?.userId : "guest";
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (isAuthenticated) { const { data } = await API.get("/profiles/learning-progress"); if (currentScope.current === scope) setRecords(data.records); }
      else { const stored = JSON.parse(localStorage.getItem(GUEST_KEY) || "[]"); setRecords(Array.isArray(stored) ? stored : []); }
    } catch { if (currentScope.current === scope) setError("Study progress could not be loaded. Please retry before making changes."); }
    finally { if (currentScope.current === scope) setLoading(false); }
  }, [isAuthenticated, scope]);
  useEffect(() => { void load(); }, [load]);
  const update = async (key, fields) => {
    if (saving || loading) return;
    setSaving(true); setError("");
    try {
      let record;
      if (isAuthenticated) { const { data } = await API.patch("/profiles/learning-progress", { key, ...fields }); record = data.record; }
      else { record = { ...records.find((r) => r.key === key), key, ...fields, lastViewedAt: new Date().toISOString() }; }
      if (currentScope.current !== scope) return;
      const next = [...records.filter((r) => r.key !== key), record];
      if (!isAuthenticated) localStorage.setItem(GUEST_KEY, JSON.stringify(next));
      setRecords(next);
    } catch (err) { if (currentScope.current === scope) setError(err.response?.data?.message || "Your progress was not saved. Please retry."); }
    finally { setSaving(false); }
  };
  return { records, loading, saving, error, update, retry: load, isAuthenticated };
}
