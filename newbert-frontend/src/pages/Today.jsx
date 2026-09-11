import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, BriefcaseBusiness, CalendarClock, Check, CheckCheck, Flag, RefreshCw, ScanLine, Sparkles } from "lucide-react";
import API from "../Services/api";
import TodayFocus from "../components/TodayFocus";
import TodayMomentum from "../components/TodayMomentum";
import TodayJourney, { TodayProgress } from "../components/TodayJourney";
import "../today.css";
import useAuth from "../hook/useAuth";
import { updateImprovementTask } from "../Services/improvementPlanService";
import { activityWeek } from "../utils/todayActivity";
import { deadlineLabel, readSaved, recommendTask, saveLocal, taskKey } from "../utils/todayPersonalization";

const destinations = [
  ["/roadmap", "My Plan", "Continue your preparation"], ["/jobs", "Jobs", "Explore roles and saved applications"],
  ["/courses", "Courses", "Study a gap in your target skills"], ["/notes", "Notes", "Return to your semester subjects"],
  ["/mentorship", "Mentorship", "Get a focused review"],
  ["/resume-ai", "Resume AI", "Prepare a role-specific application"], ["/leaderboard", "Leaderboard", "Check your college activity"],
];

export default function Today() {
  const { profile, syncState } = useAuth();
  return <TodayWorkspace key={profile.userId} profile={profile} syncState={syncState}/>;
}

function TodayWorkspace({ profile, syncState }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const day = activityWeek()[6].key;
  const preferenceKey = `newbert-today:${profile.userId}:${day}:minutes`;
  const selectionKey = `newbert-today:${profile.userId}:${day}:task`;
  const [selected, setSelected] = useState(() => readSaved(selectionKey, ""));
  const selectTask = (key) => { setSelected(key); saveLocal(selectionKey, key); };
  const [minutes, setMinutes] = useState(() => {
    const saved = readSaved(preferenceKey, 25);
    return [15, 25, 45].includes(saved) ? saved : 25;
  });
  const [savedPreference, setSavedPreference] = useState(true);
  const load = useCallback(async (signal) => {
    setError("");
    try { const result = await API.get("/profiles/today", { signal }); setData(result.data); return true; }
    catch (err) { if (err.code !== "ERR_CANCELED") setError(err.response?.data?.message || "Your priorities could not be loaded. Please retry."); return false; }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load, profile.lastSyncedAt]);
  const complete = async (task) => {
    setBusy(taskKey(task));
    setNotice("");
    try {
      await updateImprovementTask(task.planId, task.id, true);
      // Remove the saved task immediately, even if the following refresh fails.
      setData((current) => ({ ...current,
        tasks: current.tasks.filter((item) => taskKey(item) !== taskKey(task)),
        nextActions: current.nextActions?.filter((item) => taskKey(item) !== taskKey(task)),
        completedThisWeek: current.completedThisWeek + 1,
        planProgress: current.planProgress?.map((plan) => plan.id === task.planId ? { ...plan, completed: Math.min(plan.total, plan.completed + 1) } : plan),
      }));
      setNotice(`“${task.title}” saved as complete. One more step in ${task.skillName}.`);
      await load();
    } catch (err) { setError(err.response?.data?.message || "The task was not saved. Please retry."); }
    finally { setBusy(""); }
  };
  const tasks = data?.nextActions ?? data?.tasks ?? [];
  const task = tasks.find((item) => taskKey(item) === selected) || recommendTask(tasks, minutes);
  const plans = data?.planProgress ?? [];
  const exploring = !profile.targetRole || profile.targetRole === "Still exploring";
  const branch = /civil/i.test(profile.branch) ? "civil" : /electrical/i.test(profile.branch) ? "electrical" : /information|computer/i.test(profile.branch) ? "information-technology" : null;
  const study = data?.continueStudying?.key;
  const studyUrl = study ? `/notes/${study.split(":")[0]}?unit=${encodeURIComponent(study)}` : branch ? `/notes/${branch}` : "/notes";
  const dateLabel = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long" });

  return <main className="today-page min-h-screen px-5 py-10 text-slate-900"><div className="mx-auto max-w-6xl">
    <header className="today-topline"><p><span className="today-live-dot"/>YOUR TODAY <span className="today-date">{dateLabel} · IST</span></p><Link to="/profile">My profile <ArrowRight size={15}/></Link></header>
    <section className="today-hero" aria-label="Your personal daily overview">
      <div className="today-hero-copy"><p className="today-eyebrow">A little intention. Real progress.</p><h1>{profile.name?.trim().split(/\s+/)[0] || "Hey"},<br/>let’s move you forward<span>.</span></h1>
        <div className="today-target"><Flag size={17}/><span>{exploring ? "Finding your direction" : profile.targetRole}{!exploring && profile.targetCompany && <small>at {profile.targetCompany}</small>}</span><Link to="/profile" aria-label="Edit your career target">Edit <ArrowRight size={13}/></Link></div>
        <p className="today-identity">{[profile.college, profile.branch, profile.graduationYear].filter(Boolean).join(" · ")}</p>
        <div className="today-checkin"><span>Make space for</span><div role="group" aria-label="Time available today">{[15, 25, 45].map((value) => <button key={value} aria-pressed={minutes === value} onClick={() => { setMinutes(value); selectTask(""); setSavedPreference(saveLocal(preferenceKey, value)); }}>{value}<small> min</small>{minutes === value && <Check size={13}/>}</button>)}</div></div>
        <p className="today-checkin-note">{savedPreference ? "Your next step adapts to your time. Saved for today on this device." : "Your time choice works here, but this browser couldn’t save it."}</p>
      </div>
      {data ? <TodayProgress plans={plans}/> : <div className="today-hero-placeholder"><Flag size={40}/><p>{loading ? "Gathering your progress…" : "Your progress will appear when we reconnect."}</p></div>}
    </section>
    {error && <div role="alert" className="today-error"><p>{error}</p><button onClick={() => load()}><RefreshCw size={16}/>Retry</button></div>}
    <div role="status" aria-live="polite">{notice && <div key={notice} className="today-success"><CheckCheck size={20}/><p>{notice}</p></div>}</div>
    {loading ? <div role="status" className="today-loading"><RefreshCw size={20} className="animate-spin"/>Loading your priorities…</div> : data && <>
      <section className="today-stats" aria-label="Your progress"><Stat icon={CheckCheck} value={data.completedThisWeek} label="Tasks finished" detail="Last 7 days"/><Stat icon={Flag} value={data.activePlans} label="Active skill plans" detail="Your preparation"/><Stat icon={BriefcaseBusiness} value={data.applications} label="Applications" detail="In progress or offered"/><Stat icon={ScanLine} value={data.awaitingReview} label="Awaiting review" detail="Submitted evidence"/></section>
      <section className="today-workspace">
        <div className="today-main-column"><TodayJourney plans={plans} selectedPlan={task?.planId} onSelect={(id) => { const next = tasks.find((item) => item.planId === id); if (next) selectTask(taskKey(next)); }}/>
          <TodayFocus tasks={tasks} task={task} onSelect={(item) => selectTask(taskKey(item))} minutes={minutes} userId={profile.userId} busy={busy} onComplete={complete} activePlans={data.activePlans} syncing={Boolean(syncState.running.length)}/>
        </div>
        <aside className="today-side-column"><TodayMomentum profile={profile}/>
          <section className="today-deadlines"><div className="today-section-heading"><h2><CalendarClock size={19}/>Don’t miss your window</h2></div><p className="today-section-note">Application deadlines from your saved jobs.</p>{data.upcoming.length ? data.upcoming.map((job) => <Link key={job.id} to="/jobs" className="today-deadline"><span className="today-deadline-date"><strong>{new Date(job.deadline).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric" })}</strong><small>{new Date(job.deadline).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short" })}</small></span><span><strong>{job.title}</strong><small>{job.company}</small><em>{deadlineLabel(job.deadline)}</em></span><ArrowRight size={16}/></Link>) : <div className="today-sidebar-empty"><CalendarClock size={24}/><p>No upcoming deadlines on your saved jobs.</p><Link to="/jobs">Explore jobs <ArrowRight size={14}/></Link></div>}</section>
          <section className="today-study"><BookOpen size={23}/><div><p className="today-eyebrow">Keep the thread</p><h2>Continue learning</h2><p>{study ? "Pick up your most recent unfinished unit." : "Build your foundations alongside placement preparation."}</p><Link to={studyUrl}>{study ? "Resume unit" : "Open notes"}<ArrowRight size={15}/></Link></div></section>
        </aside>
      </section>
    </>}
    <section className="today-explore"><div className="today-section-heading"><h2><Sparkles size={18}/>Your Newbert toolkit</h2><span>Here when you need it</span></div><div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">{destinations.map(([url, title, description]) => <Link key={url} to={url} className="group border-b border-slate-200 pb-4"><span className="flex items-center justify-between font-bold group-hover:text-orange-500">{title}<ArrowRight size={15}/></span><p className="mt-2 text-sm text-slate-500">{description}</p></Link>)}</div></section>
  </div></main>;
}

function Stat({ icon, value, label, detail }) {
  const Icon = icon;
  return <div><Icon size={18}/><strong>{value}</strong><span>{label}<small>{detail}</small></span></div>;
}
