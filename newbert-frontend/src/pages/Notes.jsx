import { useEffect, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { Bookmark, Check, Download, ExternalLink, RefreshCw } from "lucide-react";
import { branches } from "../data/notesCatalog";
import useStudyProgress from "../hook/useStudyProgress";
import API from "../Services/api";

export default function Notes() {
  return <main className="notes-page min-h-screen bg-[#171918] px-5 py-12 text-white"><div className="mx-auto max-w-6xl">
    <header className="border-b border-white/10 pb-8"><p className="text-sm font-bold text-orange-400">Newbert learning hub</p><h1 className="mt-3 text-3xl font-extrabold">Your semester, one unit at a time.</h1><p className="mt-3 text-sm leading-6 text-slate-400">Subject outlines, revision practice, and published resources for AKTU students.</p></header>
    <section className="mt-8 grid gap-5 md:grid-cols-3">{Object.entries(branches).map(([id, branch]) => <Link key={id} to={`/notes/${id}`} className="rounded-lg border border-white/10 p-6 transition hover:border-orange-400"><p className="text-sm font-bold text-orange-400">{branch.code}</p><h2 className="mt-4 text-xl font-bold">{branch.label}</h2><p className="mt-3 text-sm leading-6 text-slate-400">{branch.description}</p><p className="mt-6 text-sm text-orange-300">{branch.semesters.length} semester outlines · Open branch</p></Link>)}</section>
    <p className="mt-8 max-w-3xl text-sm leading-6 text-slate-400">Resources are published unit by unit. Check the syllabus version on each resource against your academic session. Unpublished units still include a revision worksheet.</p>
  </div></main>;
}

export function BranchNotes() {
  const { branchId } = useParams();
  const [params, setParams] = useSearchParams();
  const progress = useStudyProgress();
  const [resources, setResources] = useState([]);
  const [resourceError, setResourceError] = useState("");
  const [query, setQuery] = useState("");
  const branch = branches[branchId];
  const requested = (params.get("unit") || "").split(":");
  const semester = branch?.semesters.find((s) => s.id === requested[1]) || branch?.semesters[0];
  const subject = semester?.subjects.find((s) => s.id === requested[2]) || semester?.subjects[0];
  const unitIndex = Math.max(0, Math.min(4, (Number(requested[3]) || 1) - 1));
  const unit = subject?.units[unitIndex];
  const key = `${branchId}:${semester?.id}:${subject?.id}:${unitIndex + 1}`;
  const record = progress.records.find((r) => r.key === key) || {};
  const resource = resources.find((r) => r.key === key);
  const loadResources = async () => {
    setResourceError("");
    try { const { data } = await API.get("/notes/resources"); setResources(data.resources); }
    catch { setResourceError("Published resources could not be loaded."); }
  };
  useEffect(() => { void loadResources(); }, []);
  if (!branch) return <Navigate to="/notes" replace/>;
  const select = (sem, sub, index = 0) => setParams({ unit: `${branchId}:${sem}:${sub}:${index + 1}` });
  const completedCount = subject.units.filter((_, i) => progress.records.some((r) => r.key === `${branchId}:${semester.id}:${subject.id}:${i + 1}` && r.completed)).length;
  const disabled = progress.loading || progress.saving || Boolean(progress.error);
  const downloadWorksheet = () => {
    const text = `${subject.name}\nUnit ${unitIndex + 1}: ${unit}\n\nRevision worksheet (not official notes or a past examination paper)\n\n1. Explain the central concept in your own words.\n\n2. Work through one example or labelled diagram.\n\n3. List a common mistake and how to avoid it.\n\n4. Write one question to ask your teacher.\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a"); a.href = url; a.download = `${subject.id}-unit-${unitIndex + 1}-worksheet.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <main className="notes-page min-h-screen bg-[#171918] px-5 py-10 text-white"><div className="mx-auto max-w-6xl">
    <Link to="/notes" className="text-sm font-bold text-orange-300">All branches</Link>
    <header className="mt-5 border-b border-white/10 pb-6"><h1 className="text-3xl font-extrabold">{branch.label}</h1><p className="mt-3 text-sm text-slate-400">{progress.isAuthenticated ? "Your saved units and completed study are stored in your Newbert account." : "Guest progress is saved on this browser. Sign in for account-based progress."}</p></header>
    {(progress.error || resourceError) && <div role="alert" className="mt-4 border border-orange-400/30 p-4 text-sm"><p>{progress.error || resourceError}</p><button onClick={() => { if (progress.error) void progress.retry(); if (resourceError) void loadResources(); }} className="mt-2 inline-flex items-center gap-2 text-orange-300"><RefreshCw size={15}/>Retry</button></div>}
    <div className="grid gap-5 border-b border-white/10 py-6 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm font-bold">Semester<select className="control mt-2 w-full" value={semester.id} onChange={(e) => { const s = branch.semesters.find((item) => item.id === e.target.value); select(s.id, s.subjects[0].id); }}>{branch.semesters.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
      <label className="text-sm font-bold">Subject<select className="control mt-2 w-full" value={subject.id} onChange={(e) => select(semester.id, e.target.value)}>{semester.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="text-sm font-bold">Find a unit<input className="control mt-2 w-full" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this subject"/></label>
    </div>
    <section className="grid gap-8 py-8 lg:grid-cols-[320px_1fr]">
      <aside><div className="flex items-end justify-between gap-4"><h2 className="text-lg font-bold">{subject.name}</h2><span className="text-sm text-orange-300">{completedCount}/5</span></div><progress className="mt-4 h-2 w-full accent-orange-500" value={completedCount} max={5} aria-label="Units completed"/>
        <div className="mt-4 space-y-2">{subject.units.map((name, i) => {
          if (query && !name.toLowerCase().includes(query.toLowerCase())) return null;
          const state = progress.records.find((r) => r.key === `${branchId}:${semester.id}:${subject.id}:${i + 1}`);
          return <button key={name} onClick={() => select(semester.id, subject.id, i)} className={`flex w-full items-center gap-3 rounded border p-3 text-left ${i === unitIndex ? "border-orange-400 bg-orange-500/10" : "border-white/10 hover:border-orange-400/50"}`}><span className="grid h-6 w-6 shrink-0 place-items-center text-sm text-orange-300">{state?.completed ? <Check size={16}/> : i + 1}</span><span className="min-w-0 flex-1 text-sm">{name}</span>{state?.saved && <Bookmark size={14} className="shrink-0 text-orange-300"/>}</button>;
        })}{!subject.units.some((name) => name.toLowerCase().includes(query.toLowerCase())) && <p className="text-sm text-slate-400">No matching units.</p>}</div>
      </aside>
      <article className="min-w-0"><p className="text-sm text-orange-400">Unit {unitIndex + 1}</p><h2 className="mt-2 text-2xl font-bold">{unit}</h2><p className="mt-4 text-sm leading-7 text-slate-400">{resource?.summary || "Build a concise explanation, work through an example, and test what you remember without looking at your notes."}</p>
        {resource?.syllabusVersion && <p className="mt-3 text-xs text-slate-400">Syllabus: {resource.syllabusVersion} · Updated {new Date(resource.updatedAt).toLocaleDateString("en-IN")}</p>}
        <div className="mt-6 space-y-3">{resource?.lectureUrl ? <ResourceLink url={resource.lectureUrl} label="Watch published lecture"/> : <ResourceLink url={`https://www.youtube.com/results?search_query=${encodeURIComponent(`AKTU ${subject.name} ${unit}`)}`} label="Search YouTube for this topic"/>}
          {resource?.notesUrl ? <ResourceLink url={resource.notesUrl} label="Open published notes"/> : <p className="text-sm text-slate-400">Official unit notes have not been published here yet.</p>}
          {resource?.questionsUrl && <ResourceLink url={resource.questionsUrl} label="Open previous-year questions"/>}
          {resource?.syllabusUrl && <ResourceLink url={resource.syllabusUrl} label="View syllabus source"/>}
        </div>
        <div className="mt-7 border-y border-white/10 py-5"><h3 className="font-bold">Revision practice</h3><p className="mt-2 text-sm leading-6 text-slate-400">Explain {unit} with a definition, a diagram or worked example, and one application.</p><button onClick={downloadWorksheet} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-orange-300"><Download size={16}/>Download revision worksheet</button></div>
        <div className="mt-6 flex flex-wrap gap-3"><button disabled={disabled} onClick={() => progress.update(key, { completed: !record.completed })} className="inline-flex items-center gap-2 rounded bg-orange-500 px-4 py-3 text-sm font-bold text-black disabled:opacity-50"><Check size={16}/>{record.completed ? "Mark incomplete" : "Mark unit complete"}</button><button disabled={disabled} onClick={() => progress.update(key, { saved: !record.saved })} className="inline-flex items-center gap-2 rounded border border-white/20 px-4 py-3 text-sm font-bold text-orange-300 disabled:opacity-50"><Bookmark size={16}/>{record.saved ? "Unsave unit" : "Save unit"}</button></div>
      </article>
    </section>
  </div></main>;
}
function ResourceLink({ url, label }) { return <a href={url} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-2 text-sm font-bold text-orange-300 hover:underline">{label}<ExternalLink size={15}/></a>; }
