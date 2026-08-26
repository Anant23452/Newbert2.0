import { useMemo, useState } from "react";
import { previewPlanContext } from "../Services/planService";

const GOALS = [
  ["software-placement", "Software Placement", "Software Developer"],
  ["core-placement", "Core Placement", "Core Engineering"],
  ["gate", "GATE", "GATE"],
  ["internship", "Internship", "Intern"],
  ["data-ai", "Data / AI", "Data Analyst"],
  ["government-psu", "Government / PSU", "Government / PSU"],
  ["custom", "Custom Goal", ""],
];

const BLOCKERS = ["Don't know what to study next", "Lack of consistency", "Weak fundamentals", "Too many resources", "Low DSA confidence", "Low CGPA concern", "No good projects", "No internship", "Interview fear", "Aptitude weakness", "GATE syllabus incomplete", "Mock-test performance", "Core interview preparation", "Not sure about career direction"];
const PLAN_STYLES = [["balanced", "Balanced", "Concepts, practice and revision"], ["aggressive", "Aggressive", "More daily work for a short deadline"], ["college-friendly", "College-friendly", "Built around classes and assignments"], ["revision-heavy", "Revision-heavy", "For already-covered material"], ["practice-heavy", "Practice-heavy", "Questions, mocks and interviews first"]];
const COMPLETED_AREAS = {
  "software-placement": ["Arrays", "Linked Lists", "Trees", "Graphs", "React", "Node.js", "DBMS", "OS"],
  gate: ["Engineering Mathematics", "Network Theory", "Signals", "Machines", "Power Systems", "Control Systems"],
  "core-placement": ["Electrical Machines", "Power Systems", "Protection", "PLC", "AutoCAD", "MATLAB"],
  "data-ai": ["Python", "Statistics", "SQL", "Machine Learning", "Deployment"],
};

function inferType(role) {
  const value = String(role || "").toLowerCase();
  if (/data|machine learning|\bai\b/.test(value)) return "data-ai";
  if (/gate/.test(value)) return "gate";
  if (/government|psu/.test(value)) return "government-psu";
  if (/core/.test(value)) return "core-placement";
  if (/intern/.test(value)) return "internship";
  return "software-placement";
}

export default function GoalForm({ profile, existingPlan, submitting, error, onCancel, onSubmit }) {
  const initial = existingPlan?.target || {};
  const [target, setTarget] = useState({
    type: initial.type || inferType(profile.targetRole),
    role: initial.role || profile.targetRole || "Software Developer",
    company: initial.company || profile.targetCompany || "",
    deadline: initial.deadline ? new Date(initial.deadline).toISOString().slice(0, 10) : "",
    weeklyHours: initial.weeklyHours || 10,
    planStyle: initial.planStyle || "balanced",
    customGoal: initial.customGoal || "",
    currentStageStory: existingPlan?.selfAssessment?.currentStageStory || "",
    blockers: existingPlan?.selfAssessment?.blockers || [],
    completedAreas: existingPlan?.selfAssessment?.completedAreas || [],
  });
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const skills = useMemo(() => (profile.skills || []).map((skill) => skill.name || skill), [profile.skills]);
  const update = (key, value) => setTarget((current) => ({ ...current, [key]: value }));
  const chooseGoal = (type) => {
    const selected = GOALS.find(([value]) => value === type);
    setPreview(null);
    setTarget((current) => ({ ...current, type, role: selected?.[2] || current.role, completedAreas: current.completedAreas.filter((area) => (COMPLETED_AREAS[type] || []).includes(area)) }));
  };
  const toggleListItem = (key, value) => {
    setPreview(null);
    setTarget((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value] }));
  };
  const requestPreview = async () => {
    setPreviewing(true);
    setPreviewError("");
    try { setPreview(await previewPlanContext({ ...target, weeklyHours: Number(target.weeklyHours) })); }
    catch (requestError) { setPreviewError(requestError.response?.data?.message || "Newbert could not understand this context yet. Please try again."); }
    finally { setPreviewing(false); }
  };

  return <main className="min-h-screen bg-[#111827] px-5 py-12 text-white md:py-16"><div className="mx-auto max-w-5xl"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-orange-400">Build my plan</p><h1 className="mt-3 text-3xl font-black md:text-5xl">Choose the goal you are preparing for.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">Newbert already loaded your saved MongoDB profile. Only update the goal information that should shape this plan.</p>
    <section className="mt-8 grid gap-5 rounded-2xl border border-white/10 bg-white/5 p-5 md:grid-cols-[.75fr_1.25fr] md:p-7"><aside className="rounded-xl border border-white/10 bg-black/20 p-5"><p className="text-xs font-extrabold uppercase tracking-widest text-orange-300">Profile used</p><h2 className="mt-3 text-xl font-extrabold">{profile.name}</h2><p className="mt-1 text-sm text-slate-300">{profile.college} · {profile.branch}</p><div className="mt-5 flex flex-wrap gap-2">{skills.length ? skills.slice(0, 10).map((skill) => <span key={skill} className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-bold text-slate-200">{skill}</span>) : <span className="text-xs text-slate-400">No saved skills yet</span>}</div><div className="mt-5 space-y-1 text-xs font-semibold text-slate-400"><p>GitHub: {profile.connections?.github?.connected ? "Connected" : "Not connected"}</p><p>LeetCode: {profile.connections?.leetcode?.connected ? "Connected" : "Not connected"}</p><p>Projects: {profile.projects ?? "Not added"}</p><p>CGPA: {profile.cgpa ?? "Not added"}</p></div></aside>
      <form onSubmit={(event) => { event.preventDefault(); if (preview) onSubmit({ ...target, weeklyHours: Number(target.weeklyHours), understoodCurrentStage: preview.understoodCurrentStage }); else requestPreview(); }}><p className="text-sm font-extrabold">What are you preparing for?</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{GOALS.map(([value, label]) => <button type="button" key={value} onClick={() => chooseGoal(value)} className={`rounded-lg border px-3 py-3 text-left text-sm font-bold transition ${target.type === value ? "border-orange-400 bg-orange-400 text-slate-950" : "border-white/15 bg-white/5 text-slate-200 hover:border-orange-300"}`}>{label}</button>)}</div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2"><DarkField label="Target role" value={target.role} onChange={(value) => update("role", value)} placeholder="Example: Software Developer" required/><DarkField label="Target company (optional)" value={target.company} onChange={(value) => update("company", value)} placeholder="Example: TCS Digital"/><DarkField label="Target deadline (optional)" value={target.deadline} onChange={(value) => update("deadline", value)} type="date" min={new Date().toISOString().slice(0, 10)}/><DarkField label="Available hours each week" value={target.weeklyHours} onChange={(value) => update("weeklyHours", value)} type="number" min="2" max="60" required/>{target.type === "custom" && <div className="sm:col-span-2"><DarkField label="Describe your custom goal" value={target.customGoal} onChange={(value) => update("customGoal", value)} placeholder="What outcome are you working toward?" required/></div>}</div>
        <section className="mt-8 border-t border-white/10 pt-7"><p className="text-lg font-black">Tell Newbert where you are right now</p><p className="mt-2 text-sm leading-6 text-slate-300">Describe what you have completed, what you are working on, where you feel weak, and what you want to achieve. Newbert combines this with your saved profile and connected coding signals.</p><label className="mt-5 block text-xs font-extrabold uppercase tracking-wider text-slate-300">Your current stage<textarea value={target.currentStageStory} onChange={(event) => { update("currentStageStory", event.target.value); setPreview(null); }} rows="10" placeholder={"Example:\n\nI am currently preparing for software placements.\nI have completed arrays, linked lists, trees and graphs in DSA and solved around 220 LeetCode problems.\n\nI know React, Node.js and MongoDB and have built 3 projects, but I am weak in DBMS, OS and interview preparation."} className="mt-2 w-full resize-y rounded-lg border border-white/15 bg-[#111827] px-3 py-3 text-sm font-medium normal-case tracking-normal text-white outline-none focus:border-orange-400"/></label>
          <p className="mt-6 text-sm font-extrabold">Quickly add completed areas <span className="font-medium text-slate-400">(optional)</span></p><div className="mt-3 flex flex-wrap gap-2">{(COMPLETED_AREAS[target.type] || []).length ? (COMPLETED_AREAS[target.type] || []).map((area) => <button type="button" key={area} onClick={() => toggleListItem("completedAreas", area)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${target.completedAreas.includes(area) ? "border-orange-400 bg-orange-400 text-slate-950" : "border-white/15 text-slate-300"}`}>{area}</button>) : <span className="text-xs text-slate-400">Your story is enough for this goal.</span>}</div>
          <p className="mt-6 text-sm font-extrabold">What is stopping you right now? <span className="font-medium text-slate-400">(optional)</span></p><div className="mt-3 flex flex-wrap gap-2">{BLOCKERS.map((blocker) => <button type="button" key={blocker} onClick={() => toggleListItem("blockers", blocker)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${target.blockers.includes(blocker) ? "border-orange-400 bg-orange-400 text-slate-950" : "border-white/15 text-slate-300"}`}>{blocker}</button>)}</div>
          <p className="mt-6 text-sm font-extrabold">How should Newbert structure your plan?</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{PLAN_STYLES.map(([value, title, detail]) => <button type="button" key={value} onClick={() => { update("planStyle", value); setPreview(null); }} className={`rounded-lg border p-3 text-left ${target.planStyle === value ? "border-orange-400 bg-orange-400/10" : "border-white/15 bg-white/5"}`}><span className="block text-sm font-extrabold">{title}</span><span className="mt-1 block text-xs text-slate-400">{detail}</span></button>)}</div>
        </section>
        {(error || previewError) && <p className="mt-5 rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">{error || previewError}</p>}
        {preview && <ContextPreview preview={preview} onEdit={() => setPreview(null)}/>}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row"><button disabled={submitting || previewing || !target.role.trim()} className="rounded-lg bg-orange-500 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-orange-400 disabled:opacity-50">{submitting ? "Building your plan…" : previewing ? "Understanding your context…" : preview ? "Looks correct — build my plan" : "Understand my context"}</button>{onCancel && <button type="button" onClick={onCancel} className="rounded-lg border border-white/15 px-5 py-3 text-sm font-bold text-slate-200">Keep current plan</button>}</div>
      </form></section></div></main>;
}

function ContextPreview({ preview, onEdit }) {
  const lines = [...(preview.profileSignals || []).map((text) => ["✓", text, "text-emerald-300"]), ...(preview.understoodCurrentStage?.completed || []).map((text) => ["✓", `${text} completed`, "text-emerald-300"]), ...(preview.understoodCurrentStage?.inProgress || []).map((text) => ["◐", `${text} in progress`, "text-orange-300"]), ...(preview.understoodCurrentStage?.weakAreas || []).map((text) => ["!", `${text} needs attention`, "text-amber-300"]), ...(preview.understoodCurrentStage?.notStarted || []).map((text) => ["○", `${text} not started`, "text-slate-300"]), ...(preview.understoodCurrentStage?.target || []).map((text) => ["→", text, "text-orange-300"])];
  return <section className="mt-7 rounded-xl border border-orange-400/25 bg-orange-400/5 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-widest text-orange-300">AI context preview</p><h2 className="mt-2 text-xl font-black">What Newbert understands about you</h2></div><button type="button" onClick={onEdit} className="text-xs font-extrabold text-orange-300">Edit my current stage</button></div><div className="mt-5 grid gap-2 text-sm">{lines.length ? lines.map(([mark, text, tone], index) => <p key={`${text}-${index}`} className="flex gap-2 text-slate-200"><span className={tone}>{mark}</span>{text}</p>) : <p className="text-slate-300">Your saved profile and selected goal will guide the first version of this plan.</p>}</div></section>;
}

function DarkField({ label, value, onChange, type = "text", ...props }) {
  return <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300">{label}<input {...props} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-[#111827] px-3 py-3 text-sm font-semibold normal-case tracking-normal text-white outline-none focus:border-orange-400"/></label>;
}
