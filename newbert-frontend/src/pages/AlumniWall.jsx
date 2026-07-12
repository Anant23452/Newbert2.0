import { useMemo, useState } from "react";
import AlumniCard from "../components/AlumniCard";
import { dummyAlumni } from "../data/dummyAlumni";

const filters = ["All", "Placement", "GATE"];

export default function AlumniWall() {
  const [type, setType] = useState("All");
  const [query, setQuery] = useState("");
  const [comparedAlumni, setComparedAlumni] = useState(null);
  const results = useMemo(() => dummyAlumni.filter((alumni) => {
    const typeMatch = type === "All" || alumni.type === type.toLowerCase();
    const searchable = `${alumni.name} ${alumni.college} ${alumni.company} ${alumni.role}`.toLowerCase();
    return typeMatch && searchable.includes(query.toLowerCase());
  }), [type, query]);
  return <main className="mx-auto max-w-6xl px-5 py-12 md:py-16">
    <div className="max-w-2xl"><p className="eyebrow">Verified outcomes</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">Learn from students who have already made it through.</h1><p className="mt-4 text-sm leading-6 text-slate-600">Filter alumni outcomes by path, college, company or role. These are the profiles Newbert uses to make your plan relevant.</p></div>
    <div className="mt-9 flex flex-col gap-4 border-y border-slate-200 py-4 md:flex-row md:items-center md:justify-between"><div className="flex gap-2">{filters.map((filter) => <button key={filter} onClick={() => setType(filter)} className={`rounded-md px-3 py-2 text-sm font-bold transition ${type === filter ? "bg-teal-700 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>{filter}</button>)}</div><input value={query} onChange={(event) => setQuery(event.target.value)} className="control w-full md:w-72" placeholder="Search college, company or role" /></div>
    <div className="mt-5 flex items-center justify-between"><p className="text-sm font-semibold text-slate-600">{results.length} outcomes found</p><button className="text-sm font-bold text-teal-700">How outcomes are verified</button></div>
    <div className="mt-5 grid gap-4 md:grid-cols-2">{results.map((alumni) => <AlumniCard key={alumni.id} alumni={alumni} onCompare={setComparedAlumni}/>)}</div>
    {results.length === 0 && <div className="surface mt-5 p-10 text-center"><p className="font-bold text-slate-900">No outcomes match that search.</p><p className="mt-1 text-sm text-slate-500">Try a college name, company, or a broader filter.</p></div>}
    {comparedAlumni && <ComparePanel alumni={comparedAlumni} onClose={() => setComparedAlumni(null)}/>} 
  </main>;
}

function ComparePanel({ alumni, onClose }) {
  const isPlacement = alumni.type === "placement";
  const seniorSkills = alumni.skills;
  const currentSkills = ["JavaScript", "React", "DSA"];
  const shared = seniorSkills.filter((skill) => currentSkills.includes(skill));
  const missing = seniorSkills.filter((skill) => !currentSkills.includes(skill));
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/45 p-5" role="dialog" aria-modal="true" aria-label="AI alumni comparison"><section className="w-full max-w-xl rounded-lg bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-200 p-6"><div><p className="eyebrow">AI gap comparison</p><h2 className="mt-2 text-xl font-extrabold text-slate-950">You vs {alumni.name}</h2><p className="mt-1 text-sm text-slate-600">{alumni.role} at {alumni.company}</p></div><button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Close comparison">x</button></div><div className="p-6"><div className="grid gap-3 sm:grid-cols-3"><CompareStat label="Skill overlap" value={`${Math.round((shared.length / seniorSkills.length) * 100)}%`}/><CompareStat label="Your DSA" value="124"/><CompareStat label="Senior DSA" value={isPlacement ? alumni.dsaSolved : "GATE path"}/></div><p className="mt-6 text-sm leading-6 text-slate-700">AI insight: You already share <strong>{shared.join(", ") || "a starting foundation"}</strong>. To move closer to this outcome, focus on <strong>{missing.join(", ") || "deeper project work"}</strong>{isPlacement ? `, then build ${Math.max(0, alumni.projects - 2)} more strong project${alumni.projects - 2 === 1 ? "" : "s"} and practice about ${Math.max(0, alumni.dsaSolved - 124)} more DSA problems.` : "."}</p><div className="mt-6 flex justify-end gap-3"><button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Close</button><button className="rounded-md bg-teal-700 px-4 py-2 text-sm font-bold text-white">Add gap tasks to my plan</button></div></div></section></div>;
}
function CompareStat({ label, value }) { return <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-base font-extrabold text-slate-950">{value}</p></div>; }
