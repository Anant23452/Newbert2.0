import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dummyAlumni } from "../data/dummyAlumni";

const defaultQuestions = [
  "Walk me through a project where you owned a feature from idea to deployment.",
  "Explain a difficult technical decision you made and the trade-off behind it.",
  "How would you improve the performance and reliability of your strongest project?",
];

function companyFromDescription(description, company) {
  const knownCompany = dummyAlumni.find((alumni) => description.toLowerCase().includes(alumni.company.toLowerCase()));
  return company.trim() || knownCompany?.company || "your target company";
}

function keywordsFromDescription(description) {
  const keywords = ["React", "Node.js", "JavaScript", "TypeScript", "Java", "Spring Boot", "Python", "SQL", "MongoDB", "MySQL", "DSA", "REST APIs", "Git"];
  const matches = keywords.filter((keyword) => description.toLowerCase().includes(keyword.toLowerCase()));
  return matches.length ? matches.slice(0, 5) : ["problem solving", "projects", "technical communication"];
}

export default function ResumeAi() {
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [company, setCompany] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState(1);

  const targetCompany = useMemo(() => companyFromDescription(jobDescription, company), [jobDescription, company]);
  const keywords = useMemo(() => keywordsFromDescription(jobDescription), [jobDescription]);
  const matchedSeniors = useMemo(() => {
    const exact = dummyAlumni.filter((alumni) => alumni.type === "placement" && alumni.company.toLowerCase() === targetCompany.toLowerCase());
    return (exact.length ? exact : dummyAlumni.filter((alumni) => alumni.type === "placement")).slice(0, 2);
  }, [targetCompany]);
  const canAnalyze = resume && jobDescription.trim().length >= 30;

  const selectResume = (file) => {
    if (file?.type === "application/pdf") setResume(file);
  };

  const analyze = () => {
    if (canAnalyze) setStage(2);
  };

  const downloadResume = () => {
    const resumeDraft = [
      "NEWBERT TAILORED RESUME",
      `Target company: ${targetCompany}`,
      "",
      "PROFESSIONAL SUMMARY",
      `Developer focused on ${keywords.slice(0, 3).join(", ")} with project experience relevant to ${targetCompany}.`,
      "",
      "PROJECT HIGHLIGHT",
      `Built and deployed a role-relevant application using ${keywords.slice(0, 2).join(" and ")}. Add your own measurable impact before applying.`,
      "",
      "PRIORITY SKILLS",
      keywords.join(", "),
      "",
      "Important: This draft is based on the job description. Review every claim for accuracy before submitting.",
    ].join("\n");
    const url = URL.createObjectURL(new Blob([resumeDraft], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${targetCompany.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-tailored-resume.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="resume-ai-page min-h-screen bg-[#171918] px-5 py-14 text-white md:py-20">
      <div className="mx-auto max-w-5xl">
        <header className="max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-orange-400">Resume intelligence</p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight md:text-5xl">Make your resume fit the role. Prepare from people who got there.</h1>
          <p className="mt-4 text-sm leading-6 text-slate-400 md:text-base">Newbert connects your application with the job you want and the placement journeys closest to it.</p>
        </header>

        <div className="mt-10 grid gap-px border border-white/10 bg-white/10 md:grid-cols-3">
          {["Target role", "Tailored resume", "Senior interview prep"].map((label, index) => {
            const number = index + 1;
            return <div key={label} className={`flex items-center gap-3 px-5 py-4 ${stage === number ? "bg-orange-500 text-[#171918]" : "bg-[#20231f] text-slate-500"}`}><span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-extrabold ${stage > number ? "bg-orange-500 text-[#171918]" : stage === number ? "bg-[#171918] text-white" : "border border-white/15"}`}>{stage > number ? "OK" : number}</span><span className="text-sm font-bold">{label}</span></div>;
          })}
        </div>

        {stage === 1 && <section className="mt-8 grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <p className="text-sm font-bold text-slate-200">1. Upload your resume</p>
            {!resume ? <label onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); selectResume(event.dataTransfer.files[0]); }} className={`mt-3 flex min-h-56 cursor-pointer flex-col items-center justify-center border-2 border-dashed px-5 text-center transition ${isDragging ? "border-orange-400 bg-orange-400/10" : "border-white/15 bg-white/[.03] hover:border-orange-400/60"}`}><span className="text-sm font-extrabold text-orange-400">Upload PDF resume</span><span className="mt-2 text-xs text-slate-500">Drag it here or choose a file. PDF, up to 5 MB.</span><input className="sr-only" type="file" accept=".pdf" onChange={(event) => selectResume(event.target.files[0])}/></label> : <div className="mt-3 flex min-h-56 flex-col justify-between border border-orange-400/30 bg-orange-400/5 p-5"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-orange-300">Resume ready</p><p className="mt-3 break-all text-sm font-bold">{resume.name}</p><p className="mt-1 text-xs text-slate-400">{Math.ceil(resume.size / 1024)} KB · PDF</p></div><button onClick={() => setResume(null)} className="w-fit border border-white/15 px-3 py-2 text-xs font-bold text-slate-300 hover:border-orange-400 hover:text-orange-300">Replace file</button></div>}
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-200" htmlFor="company">2. Company you are applying to <span className="text-slate-500">(optional)</span></label>
            <input id="company" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Example: TCS Digital" className="mt-3 w-full border border-white/15 bg-white/[.03] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-orange-400"/>
            <label className="mt-6 block text-sm font-bold text-slate-200" htmlFor="job-description">3. Paste the job description</label>
            <textarea id="job-description" value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} rows="8" placeholder="Paste the full role description, requirements, and skills here..." className="mt-3 w-full resize-none border border-white/15 bg-white/[.03] p-4 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-orange-400"/>
            <div className="mt-2 flex justify-between text-xs text-slate-500"><span>{jobDescription.trim().length} characters</span><span>Target: {targetCompany}</span></div>
            <button onClick={analyze} disabled={!canAnalyze} className={`mt-6 w-full px-5 py-3 text-sm font-extrabold transition ${canAnalyze ? "bg-orange-500 text-[#171918] hover:bg-orange-400" : "cursor-not-allowed bg-white/5 text-slate-600"}`}>Analyze and tailor my resume</button>
            {!canAnalyze && <p className="mt-2 text-center text-xs text-slate-500">Add a PDF and at least 30 characters of the job description.</p>}
          </div>
        </section>}

        {stage === 2 && <section className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
          <div className="border border-white/10 bg-[#20231f] p-6 md:p-8"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-orange-400">Tailored for {targetCompany}</p><h2 className="mt-3 text-2xl font-extrabold">Your resume rewrite plan</h2><p className="mt-3 text-sm leading-6 text-slate-400">These improvements are generated from the job description. Review every claim before using it in your resume.</p><div className="mt-8 space-y-5"><RewriteBlock title="Professional summary" before="Student developer with experience in web development and problem solving." after={`Developer focused on ${keywords.slice(0, 3).join(", ")} with project experience relevant to ${targetCompany}.`} /><RewriteBlock title="Project bullets" before="Built a web application using modern tools." after={`Built and deployed a role-relevant application using ${keywords.slice(0, 2).join(" and ")}; quantify users, performance, or outcomes where possible.`} /><RewriteBlock title="Skills order" before="List skills in the order you learned them." after={`Move ${keywords.join(", ")} to the top only when you can discuss them confidently in an interview.`} /></div></div>
          <aside className="border border-white/10 bg-[#171918] p-6"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-orange-400">Match signal</p><p className="mt-4 text-5xl font-extrabold text-orange-400">{Math.min(92, 54 + keywords.length * 7)}%</p><p className="mt-1 text-sm text-slate-400">keyword coverage</p><div className="mt-7 border-t border-white/10 pt-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Prioritize</p><div className="mt-3 flex flex-wrap gap-2">{keywords.map((keyword) => <span key={keyword} className="border border-orange-400/30 bg-orange-400/10 px-2 py-1 text-xs font-bold text-orange-300">{keyword}</span>)}</div></div><button onClick={downloadResume} className="mt-8 w-full border border-orange-400/60 px-4 py-3 text-sm font-extrabold text-orange-300 hover:bg-orange-400 hover:text-[#171918]">Download tailored resume</button><button onClick={() => setStage(3)} className="mt-3 w-full bg-orange-500 px-4 py-3 text-sm font-extrabold text-[#171918] hover:bg-orange-400">See senior interview prep</button><button onClick={() => setStage(1)} className="mt-3 w-full border border-white/15 px-4 py-3 text-sm font-bold text-slate-300 hover:border-orange-400">Edit inputs</button></aside>
        </section>}

        {stage === 3 && <section className="mt-8 grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
          <div className="border border-white/10 bg-[#20231f] p-6"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-orange-400">Placement context</p><h2 className="mt-3 text-2xl font-extrabold">Seniors connected to {targetCompany}</h2><p className="mt-3 text-sm leading-6 text-slate-400">{matchedSeniors.length && matchedSeniors[0].company.toLowerCase() === targetCompany.toLowerCase() ? "Matched from Newbert alumni outcomes." : "No exact company match yet, so these placement profiles are the closest available examples."}</p><div className="mt-6 space-y-3">{matchedSeniors.map((senior) => <button key={senior.id} onClick={() => navigate(`/alumni-wall/${senior.id}`)} className="block w-full border border-white/10 bg-[#171918] p-4 text-left transition hover:border-orange-400 hover:bg-orange-400/5"><div className="flex items-start justify-between gap-3"><div><p className="font-extrabold">{senior.name}</p><p className="mt-1 text-xs text-orange-300">{senior.company} · {senior.role}</p></div><p className="text-xs text-slate-500">View profile</p></div><p className="mt-3 text-xs leading-5 text-slate-400">{senior.quote}</p><div className="mt-3 flex flex-wrap gap-1.5">{senior.skills.slice(0, 4).map((skill) => <span key={skill} className="border border-white/10 px-2 py-1 text-[11px] text-slate-300">{skill}</span>)}</div></button>)}</div></div>
          <div className="border border-white/10 bg-[#171918] p-6 md:p-8"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-orange-400">Interview practice</p><h2 className="mt-3 text-2xl font-extrabold">Questions to prepare next</h2><p className="mt-3 text-sm leading-6 text-slate-400">Practice prompts built from the job description and the skills shown in matched senior profiles. They are not presented as a record of an individual senior's exact interview questions.</p><div className="mt-7 space-y-3">{[...keywords.slice(0, 2).map((skill) => `Show how you used ${skill} in a project and explain one challenge you solved.`), ...defaultQuestions].map((question, index) => <div key={question} className="flex gap-4 border-l-2 border-orange-400 bg-[#20231f] px-4 py-4"><span className="font-mono text-xs text-orange-300">0{index + 1}</span><p className="text-sm leading-6 text-slate-200">{question}</p></div>)}</div><button onClick={() => setStage(1)} className="mt-8 border border-white/15 px-4 py-3 text-sm font-bold text-slate-300 hover:border-orange-400">Analyze another role</button></div>
        </section>}
      </div>
    </main>
  );
}

function RewriteBlock({ title, before, after }) {
  return <article className="border-l-2 border-orange-400 bg-[#171918] p-4"><p className="text-xs font-extrabold uppercase tracking-[.14em] text-orange-300">{title}</p><p className="mt-3 text-xs text-slate-500">Current direction</p><p className="mt-1 text-sm text-slate-400">{before}</p><p className="mt-4 text-xs font-bold text-orange-300">Suggested direction</p><p className="mt-1 text-sm leading-6 text-slate-200">{after}</p></article>;
}
