import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dummyAlumni } from "../data/dummyAlumni";

const skills = ["React", "JavaScript", "Node.js", "DSA", "Java", "Spring Boot", "SQL", "MongoDB", "Python", "Git"];
const courses = [
  { id: "react", title: "Production React", provider: "Frontend path", level: "Intermediate", duration: "6 weeks", skills: ["React", "JavaScript", "Git"], roles: ["Frontend", "Full Stack"], outcome: "Build and deploy a portfolio project recruiters can inspect.", seniorIds: [1, 4, 5] },
  { id: "dsa", title: "DSA Interview Foundations", provider: "Placement core", level: "Beginner", duration: "8 weeks", skills: ["DSA"], roles: ["Frontend", "Backend", "Full Stack"], outcome: "Turn problem-solving practice into a consistent interview routine.", seniorIds: [1, 2, 4] },
  { id: "node", title: "Node.js and REST APIs", provider: "Backend path", level: "Intermediate", duration: "5 weeks", skills: ["Node.js", "JavaScript", "MongoDB"], roles: ["Backend", "Full Stack"], outcome: "Ship APIs with authentication, validation, and a deployable database.", seniorIds: [1, 5] },
  { id: "spring", title: "Java and Spring Boot", provider: "Backend path", level: "Beginner", duration: "7 weeks", skills: ["Java", "Spring Boot", "SQL"], roles: ["Backend"], outcome: "Build an interview-ready backend project with clean API design.", seniorIds: [2] },
  { id: "sql", title: "SQL for Placement Rounds", provider: "Placement core", level: "Beginner", duration: "3 weeks", skills: ["SQL"], roles: ["Backend", "Full Stack"], outcome: "Practice joins, schema design, and the database questions common in technical screens.", seniorIds: [2, 4] },
];

export default function Courses() {
  const navigate = useNavigate();
  const [currentSkills, setCurrentSkills] = useState(["React", "JavaScript"]);
  const [targetRole, setTargetRole] = useState("Full Stack");
  const [search, setSearch] = useState("");
  const [savedCourses, setSavedCourses] = useState([]);
  const [expandedCourse, setExpandedCourse] = useState(null);

  const recommendations = useMemo(() => courses.map((course) => {
    const missingSkills = course.skills.filter((skill) => !currentSkills.includes(skill));
    const roleFit = course.roles.includes(targetRole) ? 24 : 0;
    const searchFit = !search.trim() || `${course.title} ${course.skills.join(" ")}`.toLowerCase().includes(search.toLowerCase());
    const score = Math.min(98, 52 + roleFit + missingSkills.length * 8 + course.seniorIds.length * 3);
    return { ...course, missingSkills, score, searchFit };
  }).filter((course) => course.searchFit).sort((a, b) => b.score - a.score), [currentSkills, search, targetRole]);

  const seniorFor = (id) => dummyAlumni.find((alumni) => alumni.id === id);
  const topRecommendation = recommendations[0];
  const toggleSkill = (skill) => setCurrentSkills((current) => current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill]);
  const saveCourse = (id) => setSavedCourses((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return <main className="courses-page min-h-screen px-5 py-12 md:py-16">
    <div className="mx-auto max-w-6xl">
      <header className="grid gap-8 border-b border-slate-200 pb-10 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
        <div><p className="eyebrow">Course intelligence</p><h1 className="mt-3 text-3xl font-extrabold text-slate-950 md:text-5xl">Choose the next course for your gap, not the loudest launch.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">Newbert ranks learning paths by what you need for your target role and what placement seniors from your network used to build similar skills.</p></div>
        <div className="border-l-2 border-teal-700 bg-teal-50 p-5"><p className="text-xs font-extrabold uppercase tracking-[.15em] text-teal-700">Your current direction</p><p className="mt-2 text-lg font-extrabold text-slate-950">{targetRole} placement path</p><p className="mt-1 text-sm text-slate-600">{currentSkills.length ? `${currentSkills.length} skills shared` : "Choose your current skills to personalize results"}</p></div>
      </header>

      <section className="mt-8 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <div className="surface p-5"><p className="text-sm font-extrabold text-slate-950">Personalize recommendations</p><label className="mt-5 block text-xs font-bold uppercase tracking-[.13em] text-slate-600" htmlFor="role">Target role</label><select id="role" value={targetRole} onChange={(event) => setTargetRole(event.target.value)} className="control mt-2 w-full"><option>Full Stack</option><option>Frontend</option><option>Backend</option></select><p className="mt-5 text-xs font-bold uppercase tracking-[.13em] text-slate-600">Skills you already have</p><div className="mt-3 flex flex-wrap gap-2">{skills.map((skill) => <button key={skill} onClick={() => toggleSkill(skill)} className={`border px-2.5 py-1.5 text-xs font-bold transition ${currentSkills.includes(skill) ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 text-slate-600 hover:border-teal-600"}`}>{skill}</button>)}</div></div>
        <div className="surface p-5"><label className="text-sm font-extrabold text-slate-950" htmlFor="course-search">What do you want to learn?</label><div className="mt-3 flex gap-2"><input id="course-search" value={search} onChange={(event) => setSearch(event.target.value)} className="control min-w-0 flex-1" placeholder="Search React, DSA, backend..."/><button onClick={() => setSearch("")} className="border border-slate-300 px-3 text-xs font-bold text-slate-600 hover:border-teal-600">Clear</button></div><div className="mt-7 grid gap-4 sm:grid-cols-3"><Metric label="Courses analyzed" value={courses.length} /><Metric label="Senior outcomes" value={dummyAlumni.filter((alumni) => alumni.type === "placement").length} /><Metric label="Your skill gaps" value={topRecommendation?.missingSkills.length || 0} /></div></div>
      </section>

      {topRecommendation && <section className="mt-8 border border-teal-200 bg-teal-50 p-6 md:p-8"><div className="grid gap-6 lg:grid-cols-[1fr_auto]"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-teal-700">Best next move</p><h2 className="mt-3 text-2xl font-extrabold text-slate-950">{topRecommendation.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{topRecommendation.outcome}</p><div className="mt-5 flex flex-wrap gap-2">{topRecommendation.missingSkills.map((skill) => <span key={skill} className="border border-teal-300 bg-white px-2 py-1 text-xs font-bold text-teal-800">Build: {skill}</span>)}{topRecommendation.missingSkills.length === 0 && <span className="border border-teal-300 bg-white px-2 py-1 text-xs font-bold text-teal-800">You already cover the foundations</span>}</div></div><div className="min-w-36 border-l border-teal-200 pl-6"><p className="text-4xl font-extrabold text-teal-700">{topRecommendation.score}%</p><p className="mt-1 text-xs font-bold uppercase tracking-[.12em] text-teal-800">recommendation fit</p></div></div></section>}

      <section className="mt-10"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="eyebrow">Ranked paths</p><h2 className="mt-2 text-2xl font-extrabold text-slate-950">Why these courses are recommended</h2></div><p className="text-sm text-slate-600">{recommendations.length} result{recommendations.length === 1 ? "" : "s"} for your profile</p></div><div className="mt-6 grid gap-4">{recommendations.map((course, index) => <article key={course.id} className="surface p-5"><div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-start"><div className="grid h-11 w-11 place-items-center bg-slate-950 text-sm font-extrabold text-white">0{index + 1}</div><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-extrabold uppercase tracking-[.14em] text-teal-700">{course.provider}</p><span className="border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-500">{course.level} · {course.duration}</span></div><h3 className="mt-2 text-xl font-extrabold text-slate-950">{course.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{course.outcome}</p><div className="mt-4 flex flex-wrap gap-2">{course.skills.map((skill) => <span key={skill} className={`px-2 py-1 text-xs font-bold ${course.missingSkills.includes(skill) ? "bg-orange-100 text-orange-800" : "bg-slate-100 text-slate-600"}`}>{course.missingSkills.includes(skill) ? `Gap: ${skill}` : skill}</span>)}</div></div><div className="flex min-w-32 flex-row items-center gap-3 lg:flex-col lg:items-end"><p className="text-2xl font-extrabold text-teal-700">{course.score}%</p><button onClick={() => saveCourse(course.id)} className={`border px-3 py-2 text-xs font-extrabold ${savedCourses.includes(course.id) ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 text-slate-700 hover:border-teal-700"}`}>{savedCourses.includes(course.id) ? "Added to plan" : "Add to plan"}</button></div></div><div className="mt-5 border-t border-slate-100 pt-4"><button onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)} className="text-sm font-extrabold text-teal-700">{expandedCourse === course.id ? "Hide alumni evidence" : "See alumni evidence"}</button>{expandedCourse === course.id && <div className="mt-4 grid gap-3 md:grid-cols-2">{course.seniorIds.map((id) => { const senior = seniorFor(id); return senior && <button key={id} onClick={() => navigate(`/alumni-wall/${id}`)} className="border border-slate-200 bg-slate-50 p-4 text-left hover:border-teal-600"><p className="font-extrabold text-slate-950">{senior.name}</p><p className="mt-1 text-xs font-bold text-teal-700">{senior.company} · {senior.role} · {senior.package} LPA</p><p className="mt-2 text-xs leading-5 text-slate-600">{senior.quote}</p></button>; })}</div>}</div></article>)}</div>{recommendations.length === 0 && <div className="surface mt-6 p-8 text-center"><p className="font-extrabold text-slate-950">No course matches that search yet.</p><p className="mt-2 text-sm text-slate-600">Try a skill like React, DSA, Java, or backend.</p></div>}</section>
    </div>
  </main>;
}

function Metric({ label, value }) { return <div className="border-l-2 border-teal-700 pl-3"><p className="text-2xl font-extrabold text-slate-950">{value}</p><p className="mt-1 text-xs font-bold text-slate-500">{label}</p></div>; }
