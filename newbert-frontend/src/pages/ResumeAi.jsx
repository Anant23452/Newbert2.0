import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Download, FileText, Upload, RefreshCw } from "lucide-react";
import useAuth from "../hook/useAuth";
import { getPublicAlumni } from "../Services/alumniService";
import { reviewResume } from "../utils/resumeReview";

export default function ResumeAi() {
  const { profile } = useAuth();
  const [stage, setStage] = useState(1);
  const [fileName, setFileName] = useState("");
  const [original, setOriginal] = useState("");
  const [draft, setDraft] = useState("");
  const [description, setDescription] = useState("");
  const [company, setCompany] = useState(profile?.targetCompany || "");
  const [reading, setReading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState("");
  const [alumni, setAlumni] = useState([]);
  const [alumniError, setAlumniError] = useState("");
  const [alumniLoading, setAlumniLoading] = useState(false);
  const uploadVersion = useRef(0);
  const review = useMemo(() => reviewResume(draft, description), [draft, description]);
  const target = company.trim();
  const companyOf = (senior) => senior.placementOutcome?.company || senior.placement?.company || senior.company || "";
  const seniors = alumni.filter((senior) => !senior.isDummyData && !senior.isDemoData && (!target || companyOf(senior).toLowerCase() === target.toLowerCase())).slice(0, 3);
  const loadAlumni = async () => {
    setAlumniLoading(true); setAlumniError("");
    try { const result = await getPublicAlumni(); setAlumni(result.alumni || []); }
    catch { setAlumniError("Alumni profiles could not be loaded. Your resume is still available."); }
    finally { setAlumniLoading(false); }
  };
  useEffect(() => { if (stage === 3) void loadAlumni(); }, [stage]);
  useEffect(() => () => { uploadVersion.current += 1; }, []);
  const selectFile = async (file) => {
    if (!file) return;
    const version = ++uploadVersion.current;
    setError(""); setReading(true); setReviewed(false); setFileName(""); setOriginal(""); setDraft("");
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("Choose a PDF or text file smaller than 5 MB.");
      let text;
      if (/\.txt$/i.test(file.name)) text = await file.text();
      else if (/\.pdf$/i.test(file.name)) {
        const pdfjs = await import("pdfjs-dist");
        const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const loadingTask = pdfjs.getDocument({ data: bytes, isEvalSupported: false });
        let pdf;
        try {
          pdf = await loadingTask.promise;
          if (pdf.numPages > 15) throw new Error("Choose a resume with 15 pages or fewer.");
          const pages = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            pages.push(content.items.map((item) => item.str + (item.hasEOL ? "\n" : " ")).join(""));
          }
          text = pages.join("\n\n");
        } finally { await loadingTask.destroy(); }
      } else throw new Error("Choose a PDF or .txt file, or paste your resume below.");
      if (!text || text.trim().length < 40) throw new Error("No readable resume text was found. For scanned PDFs, paste the text below.");
      if (text.length > 50000) throw new Error("Keep your resume under 50,000 characters.");
      if (version === uploadVersion.current) { setOriginal(text); setDraft(text); setFileName(file.name); }
    } catch (err) { if (version === uploadVersion.current) setError(err.message || "This PDF could not be read. Paste your resume text instead."); }
    finally { if (version === uploadVersion.current) setReading(false); }
  };
  const download = async () => {
    setExporting(true); setError("");
    try {
      const normalized = draft.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, "-").replace(/•/g, "-");
      if (Array.from(normalized).some((char) => char.codePointAt(0) > 255)) throw new Error("This PDF font cannot display some characters. Use the text download to preserve them.");
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      doc.setFont("helvetica"); doc.setFontSize(11);
      const lines = doc.splitTextToSize(normalized, 174);
      let y = 20;
      for (const line of lines) { if (y > 278) { doc.addPage(); y = 20; } doc.text(line, 18, y); y += 5.5; }
      doc.save(`${(target || "newbert").replace(/[^a-z0-9]/gi, "-")}-resume.pdf`);
    } catch (err) { setError(err.message || "The PDF could not be generated."); }
    finally { setExporting(false); }
  };
  const downloadText = () => {
    const url = URL.createObjectURL(new Blob([draft], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "reviewed-resume.txt"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const canAnalyze = !reading && original.trim().length >= 40 && description.trim().length >= 30;
  return <main className="resume-ai-page min-h-screen bg-[#171918] px-5 py-10 text-white"><div className="mx-auto max-w-6xl">
    <header className="max-w-3xl"><p className="text-sm font-bold text-orange-400">Resume intelligence</p><h1 className="mt-3 text-3xl font-extrabold">Make your experience relevant to the role.</h1><p className="mt-3 text-sm leading-6 text-slate-400">Review your real resume against a job description, edit your draft, and prepare with relevant alumni.</p></header>
    <ol className="mt-8 grid grid-cols-3 border-y border-white/10">{["Your resume and role", "Review and tailor", "Senior interview prep"].map((label, i) => <li key={label} className={`min-w-0 px-3 py-4 text-sm font-bold ${stage === i + 1 ? "border-b-2 border-orange-400 text-orange-300" : "text-slate-400"}`}>{i + 1}. {label}</li>)}</ol>
    {error && <p role="alert" className="mt-5 border border-orange-400/30 p-4 text-sm text-orange-200">{error}</p>}
    {stage === 1 && <section className="mt-8 grid gap-8 lg:grid-cols-2"><div>
      <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void selectFile(e.dataTransfer.files[0]); }} className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-white/25 p-6 hover:border-orange-400"><Upload size={24} className="text-orange-400"/><span className="min-w-0"><span className="block break-all text-sm font-bold">{reading ? "Reading resume..." : fileName || "Upload PDF or text resume"}</span><span className="mt-1 block text-xs text-slate-400">Up to 5 MB. Your resume stays in this browser session.</span></span><input type="file" className="sr-only" accept=".pdf,.txt" onChange={(e) => { void selectFile(e.target.files[0]); e.target.value = ""; }}/></label>
      <label className="mt-5 block text-sm font-bold">Resume text<textarea disabled={reading} maxLength={50000} rows={15} value={original} onChange={(e) => { setOriginal(e.target.value); setDraft(e.target.value); setReviewed(false); }} className="control mt-2 w-full" placeholder="Paste your resume, or review text extracted from your file."/></label>
    </div><div><label className="block text-sm font-bold">Company (optional)<input className="control mt-2 w-full" value={company} maxLength={120} onChange={(e) => setCompany(e.target.value)} placeholder="Target company"/></label><label className="mt-5 block text-sm font-bold">Job description<textarea className="control mt-2 w-full" rows={15} maxLength={30000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Paste the role responsibilities and requirements."/></label><button disabled={!canAnalyze} onClick={() => { setDraft(original); setReviewed(false); setError(""); setStage(2); }} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded bg-orange-500 px-5 py-3 text-sm font-bold text-black disabled:opacity-40">Review my resume <ArrowRight size={16}/></button></div></section>}
    {stage === 2 && <section className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]"><div><h2 className="text-xl font-bold">Your editable draft</h2><textarea aria-label="Reviewed resume draft" value={draft} maxLength={50000} rows={22} onChange={(e) => { setDraft(e.target.value); setReviewed(false); }} className="control mt-4 w-full font-mono"/><details className="mt-4"><summary className="cursor-pointer text-sm text-orange-300">Compare with original</summary><pre className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-400">{original}</pre></details><label className="mt-5 flex items-start gap-3 text-sm text-slate-300"><input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} className="mt-1"/>I have reviewed the draft and confirm its claims are accurate.</label><div className="mt-5 flex flex-wrap gap-3"><button disabled={!reviewed || exporting || !draft.trim()} onClick={download} className="inline-flex items-center gap-2 rounded bg-orange-500 px-4 py-3 text-sm font-bold text-black disabled:opacity-40"><Download size={16}/>{exporting ? "Preparing PDF..." : "Download reviewed PDF"}</button><button disabled={!reviewed || !draft.trim()} onClick={downloadText} className="inline-flex items-center gap-2 rounded border border-white/20 px-4 py-3 text-sm disabled:opacity-40"><FileText size={16}/>Download text</button></div></div>
      <aside><h2 className="text-xl font-bold">Job-description signals</h2><p className="mt-3 text-sm leading-6 text-slate-400">{review.coverage === null ? "No tracked technical keywords were found. Review the role requirements manually." : `${review.matched.length} of ${review.required.length} tracked keywords appear in your draft (${review.coverage}%).`} This checks wording, not your ability or likelihood of being hired.</p>
        <Signal title="Already mentioned" items={review.matched}/><Signal title="Not mentioned in your draft" items={review.missing}/>
        <p className="mt-3 text-sm leading-6 text-slate-400">Add a missing skill only when you have used it and can support it with evidence. Describe your own contribution and include outcomes only when you can verify them.</p>
        {!!review.evidenceLines.length && <div className="mt-6 border-t border-white/10 pt-5"><h3 className="font-bold">Relevant lines from your resume</h3>{review.evidenceLines.map((line, i) => <p key={i} className="mt-3 border-l-2 border-orange-400 pl-3 text-sm leading-6 text-slate-300">{line}</p>)}</div>}
        <Link to="/courses" className="mt-6 block text-sm font-bold text-orange-300">Work on missing skills in Courses</Link><button onClick={() => setStage(3)} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-orange-300">Senior interview prep<ArrowRight size={16}/></button><button onClick={() => setStage(1)} className="mt-4 flex items-center gap-2 text-sm text-slate-400"><ArrowLeft size={16}/>Edit inputs</button>
      </aside></section>}
    {stage === 3 && <section className="mt-8 grid gap-8 lg:grid-cols-2"><div><h2 className="text-xl font-bold">{target ? `Alumni at ${target}` : "Public alumni journeys"}</h2><p className="mt-3 text-sm text-slate-400">Real published profiles. Individual experiences are not a guarantee of your interview questions.</p>{alumniLoading ? <p className="mt-5 text-sm">Loading alumni...</p> : alumniError ? <div role="alert" className="mt-5"><p>{alumniError}</p><button onClick={loadAlumni} className="mt-2 flex items-center gap-2 text-orange-300"><RefreshCw size={15}/>Retry</button></div> : seniors.length ? seniors.map((senior) => <Link key={senior._id} to={`/alumni-wall/${senior._id}`} className="mt-4 block rounded-lg border border-white/10 p-5 hover:border-orange-400"><p className="font-bold">{senior.name}</p><p className="mt-2 text-sm text-orange-300">{companyOf(senior)} · {senior.placementOutcome?.role || senior.role || ""}</p><p className="mt-2 text-sm text-slate-400">{senior.college}</p><p className="mt-4 text-sm">View profile and interview experience</p></Link>) : <p className="mt-5 text-sm text-slate-400">No published alumni match this company yet. <Link className="text-orange-300" to="/alumni-wall">Explore other journeys</Link></p>}</div>
      <div><h2 className="text-xl font-bold">Suggested practice questions</h2><p className="mt-3 text-sm text-slate-400">Practice prompts, not reported questions from an individual senior.</p><ol className="mt-5 space-y-4">{[...review.matched.slice(0, 3).map((skill) => `Where have you used ${skill}, and what did you personally implement?`), ...review.missing.slice(0, 2).map((skill) => `The role mentions ${skill}. What would you need to learn or demonstrate before using it?`), "Walk through a project decision, its trade-offs, and a result you can verify."].map((question) => <li key={question} className="border-l-2 border-orange-400 pl-4 text-sm leading-6">{question}</li>)}</ol><Link to="/mentorship" className="mt-6 block text-sm font-bold text-orange-300">Ask for a focused mentor review</Link><button onClick={() => setStage(2)} className="mt-6 inline-flex items-center gap-2 text-orange-300"><ArrowLeft size={16}/>Back to my draft</button></div></section>}
  </div></main>;
}
function Signal({ title, items }) { return <div className="mt-5"><h3 className="text-sm font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-orange-300">{items.length ? items.join(", ") : "None detected"}</p></div>; }
