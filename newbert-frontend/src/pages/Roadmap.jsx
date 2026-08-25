import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import GoalForm from "../planComponents/GoalForm";
import PlanDashboard from "../planComponents/PlanDashboard";
import useAuth from "../hook/useAuth";
import { generatePlan, getMyPlan, getPlanExplanation, recalculatePlan, setPlanTaskCompleted } from "../Services/planService";

export default function Roadmap() {
  const { profile, loading: authLoading, isAuthenticated } = useAuth();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [busyTask, setBusyTask] = useState("");
  const [changingGoal, setChangingGoal] = useState(false);
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    getMyPlan().then((saved) => { if (active) setPlan(saved); }).catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Unable to load your saved plan."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authLoading, isAuthenticated]);

  const build = async (target) => {
    setSubmitting(true);
    setError("");
    try {
      let next;
      try { next = await generatePlan(target); }
      catch (requestError) {
        if (requestError.response?.status !== 409 || !requestError.response?.data?.requiresConfirmation) throw requestError;
        const confirmed = window.confirm("Update your active plan to this new goal? Completed task history will be preserved.");
        if (!confirmed) return;
        next = await generatePlan(target, true);
      }
      setPlan(next);
      setAiExplanation("");
      setAiError("");
      setChangingGoal(false);
    } catch (requestError) { setError(requestError.response?.data?.message || "Plan generation failed. Please try again."); }
    finally { setSubmitting(false); }
  };

  const toggleTask = async (task) => {
    setBusyTask(task.id);
    setError("");
    try { setPlan(await setPlanTaskCompleted(task.id, !task.completed)); setAiExplanation(""); setAiError(""); }
    catch (requestError) { setError(requestError.response?.data?.message || "Unable to save task progress."); }
    finally { setBusyTask(""); }
  };

  const recalculate = async () => {
    setRecalculating(true);
    setError("");
    try { setPlan(await recalculatePlan()); setAiExplanation(""); setAiError(""); }
    catch (requestError) { setError(requestError.response?.data?.message || "Unable to recalculate your plan."); }
    finally { setRecalculating(false); }
  };

  const explainPlan = async () => {
    setAiLoading(true);
    setAiError("");
    try { setAiExplanation(await getPlanExplanation()); }
    catch (requestError) { setAiError(requestError.response?.data?.message || "Newbert AI is temporarily unavailable. Please try again."); }
    finally { setAiLoading(false); }
  };

  if (authLoading || loading) return <PlanLoading/>;
  if (!isAuthenticated) return <Message title="Sign in to build your personal plan." detail="Newbert needs your authenticated MongoDB profile to measure your current position and persist progress." action="Return home" to="/"/>;
  if (!profile?.onboardingCompleted) return <Message title="Complete your profile first." detail="Only college and branch are required. Build My Plan will reuse the rest of your saved data and will not ask for it again." action="Complete profile" to="/complete-profile"/>;
  if (!plan || changingGoal) return <GoalForm profile={profile} existingPlan={plan} submitting={submitting} error={error} onCancel={plan ? () => { setChangingGoal(false); setError(""); } : null} onSubmit={build}/>;

  return <><PlanDashboard plan={plan} busyTask={busyTask} recalculating={recalculating} aiExplanation={aiExplanation} aiLoading={aiLoading} aiError={aiError} onExplainPlan={explainPlan} onTaskToggle={toggleTask} onChangeGoal={() => setChangingGoal(true)} onRecalculate={recalculate}/>{error && <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 shadow-xl">{error}</div>}</>;
}

function PlanLoading() { return <main className="min-h-screen bg-[#0f172a] px-5 py-14 text-white"><div className="mx-auto max-w-6xl animate-pulse"><div className="h-64 rounded-2xl bg-white/10"/><div className="mt-6 grid gap-6 lg:grid-cols-2"><div className="h-72 rounded-2xl bg-white/10"/><div className="h-72 rounded-2xl bg-white/10"/></div><div className="mt-6 h-80 rounded-2xl bg-white/10"/><p className="mt-6 text-sm font-semibold text-slate-400">Loading your profile, senior benchmarks, gaps, and saved progress…</p></div></main>; }

function Message({ title, detail, action, to }) { return <main className="grid min-h-[calc(100vh-4rem)] place-items-center bg-[#0f172a] px-5 text-center text-white"><div className="max-w-xl"><p className="text-xs font-extrabold uppercase tracking-widest text-orange-400">Build my plan</p><h1 className="mt-4 text-3xl font-black">{title}</h1><p className="mt-3 text-sm leading-6 text-slate-300">{detail}</p><Link to={to} className="mt-7 inline-flex rounded-lg bg-orange-500 px-5 py-3 text-sm font-extrabold text-slate-950">{action}</Link></div></main>; }
