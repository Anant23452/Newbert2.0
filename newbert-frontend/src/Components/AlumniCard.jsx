import { useNavigate } from "react-router-dom";

export default function AlumniCard({ alumni, onCompare }) {
  const navigate = useNavigate();
  const isPlacement = alumni.type === "placement";
  return <article onClick={() => navigate(`/alumni-wall/${alumni.id}`)} className="surface cursor-pointer p-5 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md">
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3"><div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-extrabold ${alumni.avatarColor}`}>{alumni.initials}</div><div className="min-w-0"><h3 className="truncate text-sm font-bold text-slate-950">{alumni.name}</h3><p className="mt-0.5 truncate text-xs text-slate-500">{alumni.college} · {alumni.batch}</p><p className="mt-0.5 truncate text-xs font-semibold text-slate-700">{alumni.company}</p></div></div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${isPlacement ? "bg-teal-50 text-teal-800" : "bg-indigo-50 text-indigo-700"}`}>{isPlacement ? `${alumni.package} LPA` : `AIR ${alumni.gateAIR}`}</span>
    </div>
    <div className="mt-5 flex flex-wrap gap-2"><span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{alumni.role}</span>{alumni.skills.slice(0, 3).map((skill) => <span key={skill} className="rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">{skill}</span>)}</div>
    <div className="mt-5 grid grid-cols-3 divide-x divide-slate-200 rounded-md border border-slate-200 bg-slate-50"><Stat value={isPlacement ? alumni.dsaSolved : alumni.gateScore} label={isPlacement ? "DSA solved" : "GATE score"}/><Stat value={alumni.projects ?? "-"} label="Projects"/><Stat value={`${alumni.prepMonths} mo`} label="Prep time"/></div>
    <p className="mt-4 border-l-2 border-teal-600 pl-3 text-xs leading-5 text-slate-600">“{alumni.quote}”</p>
    <button onClick={(event) => { event.stopPropagation(); onCompare(alumni); }} className="mt-5 text-sm font-bold text-teal-700 hover:text-teal-900">Compare to my profile <span aria-hidden="true">→</span></button>
  </article>;
}
function Stat({ value, label }) { return <div className="px-2 py-3 text-center"><p className="text-sm font-extrabold text-slate-950">{value}</p><p className="mt-0.5 text-[11px] text-slate-500">{label}</p></div>; }
