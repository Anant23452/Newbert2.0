import { useState } from "react";

const roles = ["Software engineer", "Frontend developer", "Backend developer", "Data analyst"];
const checklist = [
  ["Build one deployed project", "Show a complete problem, not just a tutorial clone."],
  ["Practice 15 DSA problems", "Start with arrays, strings and two pointers."],
  ["Write your first resume", "Use outcomes and impact rather than a list of tools."],
];
const upcomingWeeks = [
  { title: "Week 2 · Proof of work", tasks: ["Deploy your project", "Write clear README notes", "Add two project outcomes to your resume"] },
  { title: "Week 3 · Interview readiness", tasks: ["Practice arrays and strings", "Revise core CS topics", "Do one mock interview"] },
  { title: "Week 4 · Application sprint", tasks: ["Tailor resume for two roles", "Save five relevant openings", "Ask one alumnus for feedback"] },
];

export default function Roadmap() {
  const [role, setRole] = useState(roles[0]);
  const [checked, setChecked] = useState([]);
  const [showFullPlan, setShowFullPlan] = useState(false);
  const toggle = (index) => setChecked((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);
  return <main className="mx-auto max-w-6xl px-5 py-12 md:py-16"><div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]"><aside><p className="eyebrow">Your placement plan</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">Start with a baseline.</h1><p className="mt-3 text-sm leading-6 text-slate-600">Choose a target role to generate a focused first week. The full comparison becomes personal once your profile and college data are connected.</p><label className="mt-7 block text-sm font-bold text-slate-800">Target role<select value={role} onChange={(event) => setRole(event.target.value)} className="control mt-2 w-full">{roles.map((item) => <option key={item}>{item}</option>)}</select></label><div className="surface mt-6 p-5"><p className="text-sm font-bold text-slate-900">Your current signal</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[42%] rounded-full bg-teal-600" /></div><p className="mt-2 text-xs text-slate-500">Complete your profile to calculate a true benchmark.</p></div></aside>
  <section className="surface overflow-hidden"><div className="border-b border-slate-200 bg-slate-950 px-6 py-6 text-white"><p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-300">Week 1</p><h2 className="mt-1 text-xl font-extrabold">Foundation for {role}</h2><p className="mt-2 text-sm text-slate-300">Three high-impact tasks based on common successful alumni patterns.</p></div><div className="divide-y divide-slate-200">{checklist.map(([title, description], index) => <label key={title} className="flex cursor-pointer gap-4 p-6 hover:bg-slate-50"><input type="checkbox" checked={checked.includes(index)} onChange={() => toggle(index)} className="mt-1 h-4 w-4 accent-orange-500"/><span><span className={`block text-sm font-bold ${checked.includes(index) ? "text-slate-400 line-through" : "text-slate-900"}`}>{title}</span><span className="mt-1 block text-sm leading-6 text-slate-600">{description}</span></span></label>)}</div>{showFullPlan && <div className="border-t border-slate-200 bg-white p-6"><p className="text-xs font-extrabold uppercase tracking-[.14em] text-orange-600">Your next three weeks</p><div className="mt-4 grid gap-3">{upcomingWeeks.map((week) => <article key={week.title} className="border border-slate-200 p-4"><h3 className="font-extrabold text-slate-950">{week.title}</h3><div className="mt-2 flex flex-wrap gap-2">{week.tasks.map((task) => <span key={task} className="bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-800">{task}</span>)}</div></article>)}</div></div>}<div className="flex items-center justify-between bg-slate-50 px-6 py-4"><span className="text-sm font-semibold text-slate-600">{checked.length} of {checklist.length} complete</span><button onClick={() => setShowFullPlan((current) => !current)} className="text-sm font-bold text-orange-700">{showFullPlan ? "Hide full plan" : "View full plan →"}</button></div></section></div></main>;
}
