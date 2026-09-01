import { useEffect, useMemo, useState } from "react";
import AlumniCard from "../Components/AlumniCard";
import useAuth from "../hook/useAuth";
import { compareWithAlumni, getPublicAlumni, getRecommendedAlumni } from "../Services/alumniService";

const filters = ["Recommended", "Placement", "GATE", "Core", "All Alumni"];

function asCard(record) {
  const alumni = record.alumni || record;
  return { ...alumni, id: alumni.id || alumni._id, type: alumni.careerPaths?.length > 1 ? "combined" : alumni.careerPaths?.[0] || alumni.path || alumni.outcomeType || alumni.type, company: alumni.placementOutcome?.company || alumni.placement?.company || alumni.company || alumni.gateOutcome?.institute || alumni.gateOutcome?.psu || "Outcome recorded", role: alumni.placementOutcome?.role || alumni.placement?.role || alumni.role || alumni.gateOutcome?.program || alumni.gateOutcome?.psuRole || "GATE pathway", package: alumni.placementOutcome?.packageLpa ?? alumni.placement?.packageLpa ?? alumni.package, gateAIR: alumni.gateOutcome?.air ?? alumni.gate?.air ?? alumni.gateAIR, dsaSolved: alumni.placementPreparation?.dsa?.totalSolved ?? alumni.dsa?.solved ?? alumni.dsaSolved, prepMonths: alumni.placementPreparation?.preparationMonths ?? alumni.gatePreparation?.preparationMonths ?? alumni.preparationMonths ?? alumni.prepMonths, initials: alumni.name?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), avatarColor: "bg-orange-100 text-orange-700", match: record.match || null };
}

export default function AlumniWall() {
  const { isAuthenticated } = useAuth();
  const [type, setType] = useState("Recommended");
  const [query, setQuery] = useState("");
  const [comparedAlumni, setComparedAlumni] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [recommended, setRecommended] = useState([]);
  const [publicAlumni, setPublicAlumni] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [sort, setSort] = useState("relevant");
  const [verificationOpen, setVerificationOpen] = useState(false);
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let active = true;
    getRecommendedAlumni(sort).then((data) => { if (active) { setRecommended(data.recommended.map(asCard)); setLoadError(""); } }).catch((error) => { if (active) setLoadError(error.response?.data?.message || "Personalized alumni are unavailable right now."); });
    return () => { active = false; };
  }, [isAuthenticated, sort]);
  useEffect(() => { let active = true; getPublicAlumni().then((data) => { if (active) setPublicAlumni((data.alumni || []).map(asCard)); }).catch((error) => { if (active) setLoadError(error.response?.data?.message || "Alumni profiles are unavailable right now."); }); return () => { active = false; }; }, []);
  const source = type === "Recommended" && recommended.length ? recommended : (publicAlumni.length ? publicAlumni : recommended);
  const results = useMemo(() => source.filter((alumni) => {
    const normalizedType = alumni.type || alumni.outcomeType || alumni.path;
    const typeMatch = type === "Recommended" || type === "All Alumni" || normalizedType === type.toLowerCase() || normalizedType === "combined" && ["Placement", "GATE"].includes(type);
    const searchable = `${alumni.name} ${alumni.college} ${alumni.company} ${alumni.role}`.toLowerCase();
    return typeMatch && searchable.includes(query.toLowerCase());
  }), [source, type, query]);
  const startCompare = async (alumni) => {
    setComparedAlumni(alumni); setComparison(null);
    if (!isAuthenticated || !alumni.id || String(alumni.id).length < 10) return;
    setLoadingComparison(true);
    try { setComparison(await compareWithAlumni(alumni.id)); }
    catch { setComparison(null); }
    finally { setLoadingComparison(false); }
  };
  return <main className="mx-auto max-w-6xl px-5 py-12 md:py-16">
    <div className="max-w-2xl"><p className="eyebrow">Verified outcomes</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">Learn from students who have already made it through.</h1><p className="mt-4 text-sm leading-6 text-slate-600">Filter alumni outcomes by path, college, company or role. These are the profiles Newbert uses to make your plan relevant.</p></div>
    <div className="mt-9 flex flex-col gap-4 border-y border-slate-200 py-4 md:flex-row md:items-center md:justify-between"><div className="flex flex-wrap gap-2">{filters.map((filter) => <button key={filter} onClick={() => setType(filter)} className={`rounded-md px-3 py-2 text-sm font-bold transition ${type === filter ? "bg-orange-500 text-slate-950" : "bg-white text-slate-600 hover:bg-slate-100"}`}>{filter}</button>)}</div><div className="flex w-full gap-2 md:w-auto"><select value={sort} onChange={(event) => setSort(event.target.value)} className="control text-sm"><option value="relevant">Most relevant</option><option value="package">Highest package</option><option value="recent">Most recent</option><option value="air">Best AIR</option></select><input value={query} onChange={(event) => setQuery(event.target.value)} className="control min-w-0 flex-1 md:w-60" placeholder="Search college, company or role" /></div></div>
    <div className="mt-5 flex items-center justify-between"><p className="text-sm font-semibold text-slate-600">{type === "Recommended" && isAuthenticated ? "Recommended for you" : `${results.length} outcomes found`}</p><button onClick={() => setVerificationOpen(true)} className="text-sm font-bold text-orange-700">How outcomes are verified</button></div>
    {loadError && <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{loadError} Showing the public outcome examples instead.</p>}
    <div className="mt-5 grid gap-4 md:grid-cols-2">{results.map((alumni) => <AlumniCard key={alumni.id} alumni={alumni} match={alumni.match} onCompare={startCompare}/>)}</div>
    {results.length === 0 && <div className="surface mt-5 p-10 text-center"><p className="font-bold text-slate-900">No outcomes match that search.</p><p className="mt-1 text-sm text-slate-500">Try a college name, company, or a broader filter.</p></div>}
    {comparedAlumni && <ComparePanel alumni={comparedAlumni} comparison={comparison} loading={loadingComparison} onClose={() => { setComparedAlumni(null); setComparison(null); }}/>} 
    {verificationOpen && <VerificationDialog onClose={() => setVerificationOpen(false)}/>} 
  </main>;
}

function ComparePanel({ alumni, comparison, loading, onClose }) {
  const match = comparison?.match || alumni.match;
  const missingSkills = comparison?.missingSkills || [];
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/45 p-5" role="dialog" aria-modal="true" aria-label="Alumni comparison"><section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-200 p-6"><div><p className="eyebrow">Personal comparison</p><h2 className="mt-2 text-xl font-extrabold text-slate-950">You vs {alumni.name}</h2><p className="mt-1 text-sm text-slate-600">{alumni.role} at {alumni.company}</p></div><button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Close comparison">x</button></div><div className="p-6">{loading ? <p className="text-sm font-semibold text-slate-600">Building your comparison…</p> : !comparison ? <p className="text-sm font-semibold text-slate-600">Sign in and complete your profile to compare real evidence. No fallback data is used.</p> : <><div className="grid gap-3 sm:grid-cols-3"><CompareStat label={comparison.similarity?.band ? "Similarity band" : match?.label || "Comparison"} value={comparison.similarity?.band?.replaceAll("_", " ") || "Available"}/><CompareStat label="Confidence" value={comparison.confidence?.level || "Unavailable"}/><CompareStat label="Comparable fields" value={comparison.confidence?.comparableFields ?? "Unavailable"}/></div><div className="mt-6 grid gap-5 sm:grid-cols-2"><div><p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">Common strengths</p><div className="mt-2 flex flex-wrap gap-2">{(comparison.commonStrengths || comparison.matchedSkills || []).map((skill) => <span key={skill} className="rounded bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">{skill}</span>)}</div></div><div><p className="text-xs font-extrabold uppercase tracking-wider text-orange-700">Main differences</p><div className="mt-2 space-y-2">{(comparison.differences || missingSkills.map((item) => item.reason)).filter(Boolean).map((item) => <p key={item} className="rounded bg-orange-50 px-2 py-1.5 text-xs font-bold text-orange-900">{item}</p>)}</div></div></div><p className="mt-5 text-xs text-slate-500">This is an evidence comparison, not an outcome probability or guarantee.</p><div className="mt-6 flex justify-end"><button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Close</button></div></>}</div></section></div>;
}
function CompareStat({ label, value }) { return <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-base font-extrabold text-slate-950">{value}</p></div>; }
function VerificationDialog({ onClose }) { return <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/45 p-5" role="dialog" aria-modal="true" aria-label="Outcome verification"><section className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl"><p className="eyebrow">Outcome verification</p><h2 className="mt-2 text-xl font-extrabold text-slate-950">Built around real student journeys</h2><p className="mt-4 text-sm leading-6 text-slate-600">Newbert records the student’s college, batch, role, company, preparation pattern, and supporting context before an outcome is shown. The backend verification workflow will add document and alumni confirmation before public launch.</p><button onClick={onClose} className="mt-6 bg-orange-500 px-4 py-2.5 text-sm font-extrabold text-[#171918] hover:bg-orange-400">Got it</button></section></div>; }
