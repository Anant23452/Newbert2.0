import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import useAuth from "../hook/useAuth";

export default function ProfileSyncStatus() {
  const { profile, syncState, syncProfile } = useAuth();
  if (!profile || (!syncState.running.length && !syncState.finished && !Object.values(syncState.errors).some(Boolean))) return null;
  const errors = Object.entries(syncState.errors).filter(([, error]) => error);
  const failed = errors.map(([provider]) => provider).filter((p) => p !== "general");
  const connected = ["github", "leetcode"].filter((p) => profile[p] || profile[`${p}Username`]);
  return <section aria-live="polite" className="border-b border-orange-400/20 bg-[#202024] px-5 py-3 text-sm text-white">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
      {syncState.running.length ? <><Loader2 size={17} className="animate-spin text-orange-400"/><span>Profile saved. Updating {syncState.running.map((p) => p === "github" ? "GitHub" : "LeetCode").join(" and ")}...</span></> : errors.length ? <><span className="flex-1">{errors.map(([p, message]) => `${p === "general" ? "Account sync" : p}: ${message}`).join(" ")}</span><button onClick={() => syncProfile(failed.length ? failed : connected)} className="inline-flex items-center gap-2 text-orange-300"><RefreshCw size={16}/>Retry failed sync</button></> : <><CheckCircle2 size={17} className="text-orange-400"/><span>Account data updated. Review detected skills in your profile.</span></>}
    </div>
  </section>;
}
