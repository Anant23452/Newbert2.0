import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Check, Clock3, RefreshCw, Target } from "lucide-react";
import API from "../Services/api";
import useAuth from "../hook/useAuth";
import { updateImprovementTask } from "../Services/improvementPlanService";

const destinations = [
  ["/roadmap", "My Plan", "Continue your preparation"], ["/jobs", "Jobs", "Explore roles and saved applications"],
  ["/courses", "Courses", "Study a gap in your target skills"], ["/notes", "Notes", "Return to your semester subjects"],
  ["/alumni-wall", "Alumni", "Explore relevant preparation journeys"], ["/mentorship", "Mentorship", "Get a focused review"],
  ["/resume-ai", "Resume AI", "Prepare a role-specific application"], ["/leaderboard", "Leaderboard", "Check your college activity"],
];

export default function Today() {
  const { profile, syncState } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setError("");
    try { const result = await API.get("/profiles/today"); setData(result.data); }
    catch (err) { setError(err.response?.data?.message || "Your priorities could not be loaded. Please retry."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load, profile.userId, profile.lastSyncedAt]);
  const complete = async (task) => {
    setBusy(task.id);
    try { await updateImprovementTask(task.planId, task.id, true); await load(); }
    catch (err) { setError(err.response?.data?.message || "The task was not saved. Please retry."); }
    finally { setBusy(""); }
  };
  const branch = /civil/i.test(profile.branch) ? "civil" : /electrical/i.test(profile.branch) ? "electrical" : /information|computer/i.test(profile.branch) ? "information-technology" : null;
  const study = data?.continueStudying?.key;
  const studyUrl = study ? `/notes/${study.split(":")[0]}?unit=${encodeURIComponent(study)}` : branch ? `/notes/${branch}` : "/notes";
  return <main className="today-page min-h-screen px-5 py-10 text-slate-900"><div className="mx-auto max-w-6xl">
    <header className="flex flex-wrap items-start justify-between gap-5 border-b border-slate-200 pb-7">
      <div><p className="text-sm font-bold text-orange-500">Today</p><h1 className="mt-2 text-3xl font-extrabold">Welcome back, {profile.name?.split(" ")[0] || "student"}.</h1><p className="mt-3 text-sm text-slate-600">{profile.targetRole === "Still exploring" ? "Explore a direction at your own pace." : `Preparing for ${profile.targetRole}${profile.targetCompany ? ` at ${profile.targetCompany}` : ""}.`}</p><p className="mt-1 text-sm text-slate-500">{profile.college} · {profile.branch} · {profile.graduationYear}</p></div>
      <Link to="/profile" className="inline-flex items-center gap-2 text-sm font-bold text-orange-500">My profile <ArrowRight size={16}/></Link>
    </header>
    {error && <div role="alert" className="mt-5 flex flex-wrap items-center gap-3 border border-red-400/30 p-4"><p className="flex-1">{error}</p><button onClick={load} className="inline-flex items-center gap-2 text-orange-500"><RefreshCw size={16}/>Retry</button></div>}
    {loading ? <p role="status" className="py-12 text-slate-500">Loading your priorities...</p> : data && <>
      <section className="grid grid-cols-2 gap-5 border-b border-slate-200 py-6 sm:grid-cols-4" aria-label="Your progress"><Stat value={data.completedThisWeek} label="Tasks finished · last 7 days"/><Stat value={data.activePlans} label="Active skill plans"/><Stat value={data.applications} label="Applications in progress or offered"/><Stat value={data.awaitingReview} label="Evidence awaiting review"/></section>
      <section className="grid gap-10 py-8 lg:grid-cols-[1.4fr_1fr]">
        <div><h2 className="flex items-center gap-2 text-xl font-bold"><Target size={20} className="text-orange-500"/>Your next steps</h2>
          {data.tasks.length ? <ul className="mt-5 divide-y divide-slate-200">{data.tasks.map((task) => <li key={`${task.planId}:${task.id}`} className="flex items-start gap-4 py-4"><button disabled={Boolean(busy)} onClick={() => complete(task)} aria-label={`Mark ${task.title} complete`} title="Mark task complete" className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded border border-orange-400 text-orange-500 hover:bg-orange-500/10 disabled:opacity-50">{busy === task.id ? <RefreshCw size={16} className="animate-spin"/> : <Check size={16}/>}</button><div className="min-w-0"><p className="text-xs font-bold text-orange-500">{task.skillName}</p><h3 className="mt-1 font-bold">{task.title}</h3><p className="mt-2 text-sm text-slate-600">{task.description}</p><p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><Clock3 size={13}/>{task.estimatedMinutes} min · From your saved plan</p></div></li>)}</ul> : <div className="mt-5 border-l-2 border-orange-400 pl-5"><h3 className="font-bold">{data.activePlans ? "Review your progress and submit evidence" : "Choose your first preparation milestone"}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{syncState.running.length ? "Your accounts are updating. You can start with your career target while they load." : "Start from your current skills, target role, and available alumni evidence."}</p><Link to="/roadmap" className="mt-4 inline-flex items-center gap-2 font-bold text-orange-500">Open My Plan <ArrowRight size={16}/></Link></div>}
          {!!data.tasks.length && <Link to="/roadmap" className="mt-4 inline-block text-sm font-bold text-orange-500">View full plan</Link>}
        </div>
        <aside className="space-y-8"><div><h2 className="text-lg font-bold">Application deadlines</h2>{data.upcoming.length ? data.upcoming.map((job) => <Link key={job.id} to="/jobs" className="mt-3 block border-l-2 border-orange-400 pl-4"><p className="font-bold">{job.title}</p><p className="mt-1 text-sm text-slate-600">{job.company} · {new Date(job.deadline).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })}</p></Link>) : <p className="mt-3 text-sm text-slate-600">No upcoming deadlines on your saved jobs. <Link to="/jobs" className="text-orange-500">Explore jobs</Link></p>}</div><div className="border-t border-slate-200 pt-6"><h2 className="flex items-center gap-2 text-lg font-bold"><BookOpen size={18}/>Continue learning</h2><p className="mt-2 text-sm text-slate-600">{study ? "Pick up your most recent unfinished unit." : "Build your foundations alongside placement preparation."}</p><Link to={studyUrl} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-orange-500">{study ? "Resume unit" : "Open notes"}<ArrowRight size={16}/></Link></div></aside>
      </section>
    </>}
    <section className="border-t border-slate-200 pt-8"><h2 className="text-lg font-bold">Explore Newbert</h2><div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">{destinations.map(([url, title, description]) => <Link key={url} to={url} className="group border-b border-slate-200 pb-4"><span className="flex items-center justify-between font-bold group-hover:text-orange-500">{title}<ArrowRight size={15}/></span><p className="mt-2 text-sm text-slate-500">{description}</p></Link>)}</div></section>
  </div></main>;
}
function Stat({ value, label }) { return <div><p className="text-2xl font-bold text-orange-500">{value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>; }
