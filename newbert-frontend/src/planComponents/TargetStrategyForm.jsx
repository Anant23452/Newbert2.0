import { BriefcaseBusiness, Building2, Check, ChevronDown, Compass, Search, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { getRoadmapTargetJobs, previewPlanContext } from "../Services/planService";

const ROLES = ["Software Engineer", "SDE Intern", "Frontend Developer", "Backend Developer", "Full Stack Developer", "ML Engineer", "Data Analyst", "Data Engineer", "DevOps / Cloud", "GATE"];
const BLOCKERS = ["Don't know what to study next", "Weak fundamentals", "Low DSA confidence", "No good projects", "Interview fear", "Too many resources"];

function inferDomain(role) {
  const value = String(role || "").toLowerCase();
  if (value === "gate") return "gate";
  if (/data|machine learning|\bml\b/.test(value)) return "data-ai";
  if (/intern/.test(value)) return "internship";
  return "software-placement";
}

export default function TargetStrategyForm({ profile, existingPlan, submitting, error, onCancel, onSubmit }) {
  const initial = existingPlan?.target || {};
  const [target, setTarget] = useState({
    role: initial.role || profile.targetRole || "",
    type: initial.type || inferDomain(profile.targetRole),
    targetType: initial.targetType || (initial.company ? "specific_company" : initial.companyCategory ? "company_category" : "role_only"),
    company: initial.company || profile.targetCompany || "",
    companyCategory: initial.companyCategory || "product",
    region: initial.region || "India",
    jobIds: (initial.jobIds || []).map(String),
    deadline: initial.deadline ? new Date(initial.deadline).toISOString().slice(0, 10) : "",
    weeklyHours: initial.weeklyHours ?? "",
    planStyle: initial.planStyle || "balanced",
    currentStageStory: existingPlan?.selfAssessment?.currentStageStory || "",
    blockers: existingPlan?.selfAssessment?.blockers || [],
    completedAreas: existingPlan?.selfAssessment?.completedAreas || [],
  });
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState("");

  useEffect(() => { let active = true; getRoadmapTargetJobs().then((value) => { if (active) setJobs(value); }).catch(() => { if (active) setJobs([]); }).finally(() => { if (active) setLoadingJobs(false); }); return () => { active = false; }; }, []);
  const update = (key, value) => { setPreview(null); setTarget((current) => ({ ...current, [key]: value })); };
  const chooseRole = (role) => setTarget((current) => ({ ...current, role, type: inferDomain(role), ...(role === "GATE" ? { targetType: "role_only", company: "", jobIds: [] } : {}) }));
  const chooseTargetType = (targetType) => setTarget((current) => ({ ...current, targetType, jobIds: targetType === "specific_company" ? current.jobIds : [] }));
  const toggleJob = (job) => setTarget((current) => {
    const exists = current.jobIds.includes(job.id);
    const jobIds = exists ? current.jobIds.filter((id) => id !== job.id) : [...current.jobIds, job.id].slice(0, 5);
    return { ...current, jobIds, company: jobIds.length === 1 && !exists ? job.company : current.company, role: current.role || job.title, type: inferDomain(current.role || job.title), targetType: "specific_company" };
  });
  const requestPreview = async () => {
    setPreviewing(true); setPreviewError("");
    try { setPreview(await previewPlanContext({ ...target, mode: target.jobIds.length ? "job" : "role", weeklyHours: target.weeklyHours === "" ? null : Number(target.weeklyHours) })); }
    catch (requestError) { setPreviewError(requestError.response?.data?.message || "Newbert could not review this target yet."); }
    finally { setPreviewing(false); }
  };
  const submit = async (event) => {
    event.preventDefault();
    const payload = { ...target, mode: target.jobIds.length ? "job" : "role", company: target.targetType === "specific_company" ? target.company : "", companyCategory: target.targetType === "company_category" ? target.companyCategory : null, weeklyHours: target.weeklyHours === "" ? null : Number(target.weeklyHours), understoodCurrentStage: preview?.understoodCurrentStage };
    if (!preview) return requestPreview();
    return onSubmit(payload);
  };

  return <main className="min-h-screen bg-[#0b1220] px-4 py-10 text-white sm:px-6"><div className="mx-auto max-w-5xl"><div className="flex items-center gap-2 text-xs font-black uppercase text-orange-300"><Target className="h-4 w-4"/> Target strategy</div><h1 className="mt-3 text-3xl font-black md:text-5xl">Where do you want to get hired?</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">Role comes first. Company evidence can make the benchmark more specific, but Newbert will continue with an honest role baseline when exact evidence is unavailable.</p>
    <form onSubmit={submit} className="mt-8 space-y-6">
      <section className="rounded-lg bg-[#111c30] p-6 md:p-8"><Step number="1" title="What role are you targeting?"/><div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{ROLES.map((role) => <button type="button" key={role} onClick={() => { chooseRole(role); setPreview(null); }} className={`rounded-md px-4 py-3 text-left text-sm font-bold ${target.role === role ? "bg-orange-400 text-slate-950" : "bg-white/6 text-slate-200 hover:bg-white/10"}`}>{role}</button>)}</div><Field label="Or enter another supported role" value={target.role} onChange={(value) => { update("role", value); update("type", inferDomain(value)); }} placeholder="Example: Software Engineer Intern" required/></section>

      <section className="rounded-lg bg-[#111c30] p-6 md:p-8"><Step number="2" title={target.type === "gate" ? "GATE preparation target" : "What kind of target do you have?"}/>{target.type === "gate" ? <p className="mt-5 rounded-lg bg-[#0b1425] p-4 text-sm leading-6 text-slate-300">GATE uses subject coverage, PYQs, mock tests, and revision evidence. Company placement assumptions are not applied.</p> : <div className="mt-5 grid gap-3 md:grid-cols-3"><TargetType icon={<Building2 className="h-5 w-5"/>} title="Specific company" detail="Use exact company and verified job evidence when available." active={target.targetType === "specific_company"} onClick={() => chooseTargetType("specific_company")}/><TargetType icon={<BriefcaseBusiness className="h-5 w-5"/>} title="Company category" detail="Use role first, then product, service, or startup context." active={target.targetType === "company_category"} onClick={() => chooseTargetType("company_category")}/><TargetType icon={<Compass className="h-5 w-5"/>} title="Role only" detail="Build an exploratory role-level strategy." active={target.targetType === "role_only"} onClick={() => chooseTargetType("role_only")}/></div>}
        {target.targetType === "specific_company" && <div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Company" value={target.company} onChange={(value) => update("company", value)} placeholder="Example: Microsoft" required/><Field label="Region" value={target.region} onChange={(value) => update("region", value)} placeholder="India"/></div>}
        {target.targetType === "company_category" && <div className="mt-6"><label className="text-xs font-black uppercase text-slate-400">Company category<select value={target.companyCategory} onChange={(event) => update("companyCategory", event.target.value)} className="mt-2 block w-full rounded-md bg-[#0b1425] px-3 py-3 text-sm font-bold text-white outline-none ring-1 ring-white/10"><option value="product">Product-based</option><option value="service">Service-based</option><option value="startup">Startup</option></select></label></div>}
      </section>

      {target.targetType === "specific_company" && <section className="rounded-lg bg-[#111c30] p-6 md:p-8"><Step number="3" title="Attach saved job evidence (optional)"/><p className="mt-2 text-sm leading-6 text-slate-400">A saved, verified job description is stronger evidence than a generic company assumption.</p><div className="mt-5 space-y-2">{loadingJobs ? <p className="text-sm text-slate-400">Loading saved jobs...</p> : jobs.length ? jobs.map((job) => <label key={job.id} className="flex cursor-pointer items-start gap-3 rounded-lg bg-[#0b1425] p-4"><input type="checkbox" checked={target.jobIds.includes(job.id)} onChange={() => { toggleJob(job); setPreview(null); }} className="mt-1 h-4 w-4 accent-orange-400"/><span><span className="block text-sm font-bold">{job.title}</span><span className="mt-1 block text-xs text-slate-500">{job.company} · {job.requirementCount} structured requirements</span></span></label>) : <p className="text-sm text-slate-400">No saved verified jobs yet. Newbert will search its verified Jobs collection, then fall back honestly.</p>}</div></section>}

      <section className="rounded-lg bg-[#111c30] p-6 md:p-8"><Step number={target.targetType === "specific_company" ? "4" : "3"} title="Planning context"/><div className="mt-5 grid gap-4 sm:grid-cols-3"><Field label="Target date (optional)" type="date" value={target.deadline} onChange={(value) => update("deadline", value)} min={new Date().toISOString().slice(0, 10)}/><Field label="Available hours/week" type="number" value={target.weeklyHours} onChange={(value) => update("weeklyHours", value)} placeholder="Not assumed" min="1" max="80"/><div className="rounded-lg bg-[#0b1425] p-4"><p className="text-xs font-black uppercase text-slate-500">Evidence connected</p><p className="mt-2 text-sm font-bold text-slate-200">GitHub {profile.connections?.github?.connected ? "✓" : "not connected"}</p><p className="mt-1 text-sm font-bold text-slate-200">LeetCode {profile.connections?.leetcode?.connected ? "✓" : "not connected"}</p></div></div>
        <details className="mt-6 rounded-lg bg-[#0b1425] p-4"><summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold">Add your current preparation context <ChevronDown className="h-4 w-4"/></summary><textarea value={target.currentStageStory} onChange={(event) => update("currentStageStory", event.target.value)} rows="6" placeholder="What have you completed, what feels weak, and what are you working on?" className="mt-4 w-full resize-y rounded-md bg-[#111c30] px-3 py-3 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-orange-400"/><div className="mt-4 flex flex-wrap gap-2">{BLOCKERS.map((blocker) => <button type="button" key={blocker} onClick={() => update("blockers", target.blockers.includes(blocker) ? target.blockers.filter((item) => item !== blocker) : [...target.blockers, blocker])} className={`rounded-md px-3 py-2 text-xs font-bold ${target.blockers.includes(blocker) ? "bg-orange-400 text-slate-950" : "bg-white/8 text-slate-300"}`}>{blocker}</button>)}</div></details>
      </section>

      {(error || previewError) && <p className="rounded-lg bg-red-400/10 px-4 py-3 text-sm text-red-200">{error || previewError}</p>}
      {preview && <Preview preview={preview} onEdit={() => setPreview(null)}/>}<div className="flex flex-col gap-3 sm:flex-row"><button disabled={submitting || previewing || !target.role.trim() || (target.targetType === "specific_company" && !target.company.trim())} className="inline-flex items-center justify-center gap-2 rounded-md bg-orange-400 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{submitting ? "Building strategy" : previewing ? "Reviewing evidence" : preview ? "Build target strategy" : "Review what Newbert understood"}<Search className="h-4 w-4"/></button>{onCancel && <button type="button" onClick={onCancel} className="rounded-md bg-white/8 px-5 py-3 text-sm font-bold">Keep current strategy</button>}</div>
    </form></div></main>;
}

function Preview({ preview, onEdit }) { const lines = [...(preview.profileSignals || []), ...(preview.understoodCurrentStage?.completed || []).map((item) => `${item} recorded as completed`), ...(preview.understoodCurrentStage?.weakAreas || []).map((item) => `${item} needs attention`)]; return <section className="rounded-lg bg-emerald-400/10 p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-emerald-300">What Newbert understands</p><h2 className="mt-2 text-xl font-black">Check this before generation</h2></div><button type="button" onClick={onEdit} className="text-xs font-bold text-orange-300">Edit inputs</button></div><div className="mt-4 space-y-2">{lines.length ? lines.map((line) => <p key={line} className="flex gap-2 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"/>{line}</p>) : <p className="text-sm text-slate-400">Only your saved profile and selected target are currently available.</p>}</div></section>; }
function Step({ number, title }) { return <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-md bg-orange-400 text-sm font-black text-slate-950">{number}</span><h2 className="text-xl font-black">{title}</h2></div>; }
function TargetType({ icon, title, detail, active, onClick }) { return <button type="button" onClick={onClick} className={`rounded-lg p-4 text-left ${active ? "bg-orange-400 text-slate-950" : "bg-[#0b1425] text-white"}`}>{icon}<p className="mt-3 font-black">{title}</p><p className={`mt-1 text-xs leading-5 ${active ? "text-slate-800" : "text-slate-400"}`}>{detail}</p></button>; }
function Field({ label, value, onChange, type = "text", ...props }) { return <label className="mt-5 block text-xs font-black uppercase text-slate-400">{label}<input {...props} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-md bg-[#0b1425] px-3 py-3 text-sm font-semibold normal-case text-white outline-none ring-1 ring-white/10 focus:ring-orange-400"/></label>; }
