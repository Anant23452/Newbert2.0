import { useEffect, useMemo, useState } from "react";
import useAuth from "../hook/useAuth";
import { TARGET_ROLE_OPTIONS, getSkillSuggestions } from "../data/profileOptions";

const SOFTWARE_PLAN = {
  checklist: [
    ["Build one deployed project", "Show a complete problem, not just a tutorial clone."],
    ["Practice 15 DSA problems", "Start with arrays, strings and two pointers."],
    ["Write your first role-focused resume", "Use outcomes and impact rather than a list of tools."],
  ],
  weeks: [
    { title: "Week 2 · Proof of work", tasks: ["Deploy your project", "Write clear README notes", "Add two project outcomes to your resume"] },
    { title: "Week 3 · Interview readiness", tasks: ["Practice arrays and strings", "Revise role fundamentals", "Do one mock interview"] },
    { title: "Week 4 · Application sprint", tasks: ["Tailor your resume", "Save five relevant openings", "Ask one alumnus for feedback"] },
  ],
};

function defaultRole(branch) {
  return /computer science|information technology/i.test(branch || "") ? "Software Development" : "Core Engineering";
}

function buildPlan(role, branch) {
  if (/software|data|ai/i.test(role || "")) return SOFTWARE_PLAN;
  if (/gate/i.test(role || "")) return {
    checklist: [["Map the GATE syllabus", `Mark strong and weak ${branch || "branch"} subjects.`], ["Complete one core topic", "Learn the concept, solve previous-year questions, then revise it."], ["Start an error notebook", "Record every mistake by concept instead of only counting tests."]],
    weeks: [{ title: "Week 2 · Core revision", tasks: ["Revise two subjects", "Solve previous-year questions", "Take one sectional test"] }, { title: "Week 3 · Accuracy", tasks: ["Analyze the test", "Revisit weak concepts", "Practice engineering mathematics"] }, { title: "Week 4 · Consolidation", tasks: ["Take a mixed test", "Update the error notebook", "Plan the next revision cycle"] }],
  };
  if (/government|psu/i.test(role || "")) return {
    checklist: [["Choose your target exams", "Compare eligibility, syllabus, dates, and selection stages."], ["Build a fundamentals schedule", `Balance ${branch || "core"} topics with aptitude and current affairs.`], ["Start timed practice", "Measure accuracy and speed separately each week."]],
    weeks: [{ title: "Week 2 · Exam foundation", tasks: ["Complete one core unit", "Practice aptitude", "Review current affairs"] }, { title: "Week 3 · Timed work", tasks: ["Take a sectional test", "Analyze mistakes", "Revise formulas"] }, { title: "Week 4 · Application check", tasks: ["Review notifications", "Verify documents", "Update the next study cycle"] }],
  };
  if (/higher studies/i.test(role || "")) return {
    checklist: [["Choose a study direction", "Shortlist specializations based on subjects and projects you genuinely enjoy."], ["Map entrance requirements", "Record exams, prerequisites, deadlines, and funding options."], ["Build academic evidence", "Plan one project, paper, or faculty-guided activity relevant to your direction."]],
    weeks: [{ title: "Week 2 · Shortlist", tasks: ["Compare programs", "Identify prerequisites", "Talk to one senior"] }, { title: "Week 3 · Evidence", tasks: ["Improve one academic project", "Draft your CV", "Collect grade documents"] }, { title: "Week 4 · Preparation", tasks: ["Plan entrance study", "Track deadlines", "Draft a statement outline"] }],
  };
  const coreSkills = getSkillSuggestions(branch, "Core Engineering").slice(0, 3);
  return {
    checklist: [[`Strengthen ${branch || "your branch"} fundamentals`, "Choose one high-value core subject and create a focused revision plan."], ["Build practical evidence", `Start a lab, design, simulation, or field project${coreSkills.length ? ` using ${coreSkills.join(", ")}` : " relevant to your branch"}.`], ["Create a core-engineering resume", "Show calculations, tools, design decisions, safety, quality, and measurable outcomes."]],
    weeks: [{ title: "Week 2 · Technical foundation", tasks: ["Revise one core subject", "Document one practical exercise", "List relevant tools"] }, { title: "Week 3 · Industry readiness", tasks: ["Study one industry process", "Practice technical questions", "Ask one core alumnus for feedback"] }, { title: "Week 4 · Opportunity sprint", tasks: ["Tailor your resume", "Find five relevant roles", "Prepare a project explanation"] }],
  };
}

export default function Roadmap() {
  const { profile } = useAuth();
  const initialRole = profile?.targetRole || defaultRole(profile?.branch);
  const [role, setRole] = useState(initialRole);
  const [checked, setChecked] = useState([]);
  const [showFullPlan, setShowFullPlan] = useState(false);
  useEffect(() => { if (profile?.targetRole) setRole(profile.targetRole); }, [profile?.targetRole]);
  const plan = useMemo(() => buildPlan(role, profile?.branch), [role, profile?.branch]);
  const roles = [...new Set([role, ...TARGET_ROLE_OPTIONS.filter((item) => item !== "Other")])];
  const toggle = (index) => setChecked((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);

  return <main className="mx-auto max-w-6xl px-5 py-12 md:py-16"><div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]"><aside><p className="eyebrow">Your placement plan</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">Start with a relevant baseline.</h1><p className="mt-3 text-sm leading-6 text-slate-600">Your plan considers your academic branch and career target. A student targeting core engineering will not receive a software checklist unless they choose that direction.</p><label className="mt-7 block text-sm font-bold text-slate-800">Target role<select value={role} onChange={(event) => { setRole(event.target.value); setChecked([]); }} className="control mt-2 w-full">{roles.map((item) => <option key={item}>{item}</option>)}</select></label><div className="surface mt-6 p-5"><p className="text-sm font-bold text-slate-900">Your current direction</p><p className="mt-2 text-sm font-extrabold text-teal-700">{profile?.branch || "Branch not added"} · {role}</p><p className="mt-2 text-xs text-slate-500">Edit your profile to save a different branch or target.</p></div></aside>
  <section className="surface overflow-hidden"><div className="border-b border-slate-200 bg-slate-950 px-6 py-6 text-white"><p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-300">Week 1</p><h2 className="mt-1 text-xl font-extrabold">Foundation for {role}</h2><p className="mt-2 text-sm text-slate-300">Three practical tasks selected for this career direction.</p></div><div className="divide-y divide-slate-200">{plan.checklist.map(([title, description], index) => <label key={title} className="flex cursor-pointer gap-4 p-6 hover:bg-slate-50"><input type="checkbox" checked={checked.includes(index)} onChange={() => toggle(index)} className="mt-1 h-4 w-4 accent-orange-500"/><span><span className={`block text-sm font-bold ${checked.includes(index) ? "text-slate-400 line-through" : "text-slate-900"}`}>{title}</span><span className="mt-1 block text-sm leading-6 text-slate-600">{description}</span></span></label>)}</div>{showFullPlan && <div className="border-t border-slate-200 bg-white p-6"><p className="text-xs font-extrabold uppercase tracking-[.14em] text-orange-600">Your next three weeks</p><div className="mt-4 grid gap-3">{plan.weeks.map((week) => <article key={week.title} className="border border-slate-200 p-4"><h3 className="font-extrabold text-slate-950">{week.title}</h3><div className="mt-2 flex flex-wrap gap-2">{week.tasks.map((task) => <span key={task} className="bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-800">{task}</span>)}</div></article>)}</div></div>}<div className="flex items-center justify-between bg-slate-50 px-6 py-4"><span className="text-sm font-semibold text-slate-600">{checked.length} of {plan.checklist.length} complete</span><button onClick={() => setShowFullPlan((current) => !current)} className="text-sm font-bold text-orange-700">{showFullPlan ? "Hide full plan" : "View full plan →"}</button></div></section></div></main>;
}
