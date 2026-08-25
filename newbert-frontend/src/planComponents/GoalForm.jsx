import { useMemo, useState } from "react";

const GOALS = [
  ["software-placement", "Software Placement", "Software Developer"],
  ["core-placement", "Core Placement", "Core Engineering"],
  ["gate", "GATE", "GATE"],
  ["internship", "Internship", "Intern"],
  ["data-ai", "Data / AI", "Data Analyst"],
  ["government-psu", "Government / PSU", "Government / PSU"],
  ["custom", "Custom Goal", ""],
];

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
    customGoal: initial.customGoal || "",
  });
  const skills = useMemo(() => (profile.skills || []).map((skill) => skill.name || skill), [profile.skills]);
  const update = (key, value) => setTarget((current) => ({ ...current, [key]: value }));
  const chooseGoal = (type) => {
    const selected = GOALS.find(([value]) => value === type);
    setTarget((current) => ({ ...current, type, role: selected?.[2] || current.role }));
  };

  return <main className="min-h-screen bg-[#111827] px-5 py-12 text-white md:py-16"><div className="mx-auto max-w-5xl"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-orange-400">Build my plan</p><h1 className="mt-3 text-3xl font-black md:text-5xl">Choose the goal you are preparing for.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">Newbert already loaded your saved MongoDB profile. Only update the goal information that should shape this plan.</p>
    <section className="mt-8 grid gap-5 rounded-2xl border border-white/10 bg-white/5 p-5 md:grid-cols-[.75fr_1.25fr] md:p-7"><aside className="rounded-xl border border-white/10 bg-black/20 p-5"><p className="text-xs font-extrabold uppercase tracking-widest text-orange-300">Profile used</p><h2 className="mt-3 text-xl font-extrabold">{profile.name}</h2><p className="mt-1 text-sm text-slate-300">{profile.college} · {profile.branch}</p><div className="mt-5 flex flex-wrap gap-2">{skills.length ? skills.slice(0, 10).map((skill) => <span key={skill} className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-bold text-slate-200">{skill}</span>) : <span className="text-xs text-slate-400">No saved skills yet</span>}</div><div className="mt-5 space-y-1 text-xs font-semibold text-slate-400"><p>GitHub: {profile.connections?.github?.connected ? "Connected" : "Not connected"}</p><p>LeetCode: {profile.connections?.leetcode?.connected ? "Connected" : "Not connected"}</p><p>Projects: {profile.projects ?? "Not added"}</p><p>CGPA: {profile.cgpa ?? "Not added"}</p></div></aside>
      <form onSubmit={(event) => { event.preventDefault(); onSubmit({ ...target, weeklyHours: Number(target.weeklyHours) }); }}><p className="text-sm font-extrabold">What are you preparing for?</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{GOALS.map(([value, label]) => <button type="button" key={value} onClick={() => chooseGoal(value)} className={`rounded-lg border px-3 py-3 text-left text-sm font-bold transition ${target.type === value ? "border-orange-400 bg-orange-400 text-slate-950" : "border-white/15 bg-white/5 text-slate-200 hover:border-orange-300"}`}>{label}</button>)}</div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2"><DarkField label="Target role" value={target.role} onChange={(value) => update("role", value)} placeholder="Example: Software Developer" required/><DarkField label="Target company (optional)" value={target.company} onChange={(value) => update("company", value)} placeholder="Example: TCS Digital"/><DarkField label="Target deadline (optional)" value={target.deadline} onChange={(value) => update("deadline", value)} type="date" min={new Date().toISOString().slice(0, 10)}/><DarkField label="Available hours each week" value={target.weeklyHours} onChange={(value) => update("weeklyHours", value)} type="number" min="2" max="60" required/>{target.type === "custom" && <div className="sm:col-span-2"><DarkField label="Describe your custom goal" value={target.customGoal} onChange={(value) => update("customGoal", value)} placeholder="What outcome are you working toward?" required/></div>}</div>
        {error && <p className="mt-5 rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">{error}</p>}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row"><button disabled={submitting || !target.role.trim()} className="rounded-lg bg-orange-500 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-orange-400 disabled:opacity-50">{submitting ? "Analyzing profile and seniors…" : existingPlan ? "Update current plan" : "Build my plan"}</button>{onCancel && <button type="button" onClick={onCancel} className="rounded-lg border border-white/15 px-5 py-3 text-sm font-bold text-slate-200">Keep current plan</button>}</div>
      </form></section></div></main>;
}

function DarkField({ label, value, onChange, type = "text", ...props }) {
  return <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300">{label}<input {...props} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-[#111827] px-3 py-3 text-sm font-semibold normal-case tracking-normal text-white outline-none focus:border-orange-400"/></label>;
}
