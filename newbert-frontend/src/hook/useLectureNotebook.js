import { useCallback, useEffect, useRef, useState } from "react";
import API from "../Services/api";
import { nextReview, readStudyLocal, writeStudyLocal } from "../utils/studyTools";

// Mounted with a user+lecture key. Unsynced edits survive navigation on this device.
export default function useLectureNotebook(key, scope, authenticated) {
  const storageKey = `newbert-lecture:${scope}:${key}`;
  const blank = { key, notes: [], reflection: "", positionSeconds: 0, durationSeconds: 0, completed: false, confidence: "", reviewAt: null };
  const [initial] = useState(() => readStudyLocal(storageKey, { record: blank, pending: {}, version: 0 }));
  const draft = useRef(initial);
  const alive = useRef(true);
  const inFlight = useRef(false);
  const [record, setRecord] = useState(initial.record);
  const [version, setVersion] = useState(initial.version || 0);
  const [loading, setLoading] = useState(authenticated);
  const [canSync, setCanSync] = useState(false);
  const [status, setStatus] = useState(authenticated ? "Loading your notebook…" : "Saved on this browser");
  const [error, setError] = useState("");
  const [localOk, setLocalOk] = useState(true);

  const persist = useCallback((value) => {
    const ok = writeStudyLocal(storageKey, value);
    const indexKey = `newbert-lecture-index:${scope}`;
    const index = readStudyLocal(indexKey, []);
    const { notes: _notes, reflection: _reflection, ...summary } = value.record;
    const indexOk = writeStudyLocal(indexKey, [...(Array.isArray(index) ? index : []).filter((r) => r.key !== key), summary]);
    setLocalOk(ok && indexOk);
  }, [storageKey, scope, key]);

  const load = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true); setError("");
    try {
      const { data } = await API.get("/profiles/lecture-progress", { params: { key }, timeout: 15000 });
      if (!alive.current) return;
      const pending = draft.current.pending || {};
      // Keep notes created on another device when replaying offline additions.
      if (pending.notes) pending.notes = [...new Map([...(data.record.notes || []), ...pending.notes].map(note => [note.id, note])).values()];
      const merged = { ...data.record, ...pending };
      draft.current = { record: merged, pending, version: (draft.current.version || 0) + 1 };
      setRecord(merged); persist(draft.current); setVersion(draft.current.version); setCanSync(true);
      setStatus(Object.keys(pending).length ? "Saving your pending changes…" : "Saved to your account");
    } catch {
      if (alive.current) { setCanSync(false); setStatus("Local copy · account unavailable"); setError("Account notebook unavailable. Edits stay on this device until you retry."); }
    } finally { if (alive.current) setLoading(false); }
  }, [authenticated, key, persist]);

  useEffect(() => { alive.current = true; void load(); return () => { alive.current = false; }; }, [load]);
  useEffect(() => {
    if (!authenticated || !canSync || inFlight.current || !Object.keys(draft.current.pending || {}).length) return undefined;
    const timer = setTimeout(async () => {
      const sent = draft.current;
      inFlight.current = true;
      setStatus("Saving to your account…");
      try {
        const { data } = await API.patch("/profiles/learning-progress", { key, ...sent.pending }, { timeout: 15000 });
        if (!alive.current) return;
        if (draft.current.version === sent.version) {
          draft.current = { record: data.record, pending: {}, version: sent.version };
          setRecord(data.record); persist(draft.current); setStatus("Saved to your account"); setError("");
        }
      } catch {
        if (alive.current) { setCanSync(false); setError("Account sync paused. Your local edits will be retried when you choose Retry."); setStatus("Waiting to sync"); }
      } finally {
        inFlight.current = false;
        if (alive.current && draft.current.version !== sent.version) setVersion((value) => value + 1);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [authenticated, canSync, key, persist, version]);

  const update = useCallback((fields) => {
    const next = { ...draft.current.record, ...fields, lastViewedAt: new Date().toISOString(), ...(fields.confidence && { reviewAt: nextReview(fields.confidence) }) };
    draft.current = { record: next, pending: authenticated ? { ...draft.current.pending, ...fields } : {}, version: (draft.current.version || 0) + 1 };
    setRecord(next); persist(draft.current); setVersion(draft.current.version);
    setStatus(authenticated ? (canSync ? "Changes saved locally · syncing…" : "Saved locally · waiting to sync") : "Saved on this browser");
  }, [authenticated, canSync, persist]);
  return { record, update, loading, error, status: localOk ? status : "Browser storage is full or blocked. Keep this page open and export your notes.", retry: load, localOk };
}
