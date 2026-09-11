import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, BookOpen, Clock3, GraduationCap, Play, RotateCcw, Search } from "lucide-react";
import useAuth from "../hook/useAuth";
import useStudyProgress from "../hook/useStudyProgress";
import { channelUrl, lectureKey, lessonHref, studyCourses, studyHref } from "../data/studyCatalog";
import { isReviewDue, mergeStudySummaries, readStudyLocal, timeLabel } from "../utils/studyTools";
import "../study.css";

export default function StudyStudio() {
  const { profile, isAuthenticated } = useAuth();
  const progress = useStudyProgress();
  const [params] = useSearchParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(() => params.has("branch") ? "for-me" : "all");
  const local = readStudyLocal(`newbert-lecture-index:${isAuthenticated ? profile?.userId : "guest"}`, []);
  const records = mergeStudySummaries(progress.records, Array.isArray(local) ? local : []);
  const lectures = records.filter((r) => r.key.startsWith("lecture:") && studyCourses.some((c) => c.id === r.key.split(":")[1] && c.lessons.some((l) => l.videoId === r.key.split(":")[2])));
  const recent = [...lectures].filter((r) => !r.completed).sort((a,b) => new Date(b.lastViewedAt) - new Date(a.lastViewedAt))[0];
  const due = lectures.filter((r) => isReviewDue(r));
  const relatedBranch = /electrical/i.test(profile?.branch) ? "electrical" : /computer|information/i.test(profile?.branch) ? "information-technology" : "all";
  const courses = studyCourses.filter((c) => (filter === "all" || (filter === "for-me" ? c.branch === "all" || c.branch === relatedBranch : c.branch === filter)) && `${c.title} ${c.audience}`.toLowerCase().includes(query.toLowerCase()));
  const recentCourse = recent && studyCourses.find((c) => c.id === recent.key.split(":")[1]);
  return <main className="studio-page"><div className="studio-shell">
    <header className="studio-hero"><div><p className="studio-eyebrow">NEWBERT / STUDY STUDIO</p><h1>Watch. Work it out.<br/><span>Make it yours.</span></h1><p>Your lectures, notes and revision in one place. Pick up where you stopped, and come back to the ideas that need another pass.</p><div className="studio-hero-links"><a href={channelUrl} target="_blank" rel="noreferrer">From the Newbert channel ↗</a><Link to="/notes">Semester notes library <ArrowRight size={15}/></Link></div></div><div className="studio-learning-art" aria-hidden="true"><span className="studio-art-label">YOUR LEARNING LOOP</span><div><Play size={25}/><span>Understand</span></div><div><BookOpen size={25}/><span>Make a note</span></div><div><RotateCcw size={25}/><span>Recall it</span></div></div></header>
    <section className="studio-summary" aria-label="Your learning progress"><div><strong>{studyCourses.length}</strong><span>subject collections</span></div><div><strong>{studyCourses.reduce((sum,c) => sum+c.lessons.length,0)}</strong><span>channel lessons & revision sessions</span></div><div><strong>{lectures.filter((r) => r.completed).length}</strong><span>lessons you marked complete</span></div><div><strong>{due.length}</strong><span>recall sessions due</span></div></section>
    {progress.error && <div className="studio-notice" role="alert">{progress.error}<button onClick={progress.retry}>Retry account progress</button></div>}
    <section className="studio-return-grid">
      <div className="studio-return"><p className="studio-eyebrow">{recent ? "KEEP YOUR THREAD" : "YOUR FIRST SESSION"}</p><h2>{recentCourse?.title || (profile?.name ? `${profile.name.split(" ")[0]}, start with one lecture.` : "Start with one lecture.")}</h2><p>{recent ? `Your saved place: ${timeLabel(recent.positionSeconds)}. Your notes will be right beside the lecture.` : "Pause when something matters. Capture it in your own words. Check it again without looking."}</p><Link className="studio-primary" to={recent ? studyHref(recent.key) : lessonHref(studyCourses.find((c) => c.branch === relatedBranch)?.id || "electrical-foundations")}><Play size={15}/>{recent ? "Continue learning" : "Open a lesson"}</Link></div>
      <div className="studio-review-card"><div className="studio-heading"><h2><RotateCcw size={18}/>Revisit, then move on</h2><span>{due.length} due</span></div>{due.length ? due.slice(0,3).map((r) => <Link key={r.key} to={studyHref(r.key)}><span>{studyCourses.find((c)=>c.id === r.key.split(":")[1])?.title}<small>{r.confidence === "again" ? "You wanted another pass" : "Time for a fresh recall"}</small></span><ArrowRight size={15}/></Link>) : <p>Rate your understanding after a recall check. Your next review will show up here.</p>}</div>
    </section>
    <section className="studio-catalog"><div className="studio-heading"><div><p className="studio-eyebrow">LEARN BY SUBJECT</p><h2>Your course shelf</h2></div><label className="studio-search"><Search size={17}/><input aria-label="Search subjects" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Find a subject…"/></label></div><div className="studio-filters" role="group" aria-label="Filter subjects">{[["all","All subjects"],["for-me","For my branch"],["electrical","Electrical"],["information-technology","Computing"]].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</div>
      <div className="studio-course-grid">{courses.map((course,index)=>{
        const done = course.lessons.filter((l)=>lectures.some((r)=>r.key===lectureKey(course.id,l.videoId)&&r.completed)).length;
        const units = [...new Set(course.lessons.filter((l)=>l.unit).map((l)=>l.unit))];
        return <Link className="studio-course-card" key={course.id} to={lessonHref(course.id)}><div className={`studio-course-cover cover-${index%4}`}><img src={`https://i.ytimg.com/vi/${course.lessons[0].videoId}/hqdefault.jpg`} alt="" loading="lazy"/><span><Play size={17}/>{course.lessons.length} lessons</span><b>{course.audience}</b></div><div className="studio-course-copy"><h3>{course.title}</h3><p>Available: {units.length === 1 ? `Unit ${units[0]}` : `Units ${units.join(", ")}`}{course.lessons.some(l=>!l.unit) ? " + archived revision" : ""}</p><div className="studio-course-meta"><span><Clock3 size={13}/>~{Math.round(course.lessons.reduce((s,l)=>s+l.minutes,0)/60*10)/10} hours</span><span>{done}/{course.lessons.length} done</span></div><progress aria-label={`${course.title} completion`} value={done} max={course.lessons.length}/><span className="studio-course-cta">{done ? "Continue subject" : "Open classroom"}<ArrowRight size={16}/></span></div></Link>;
      })}</div>{!courses.length&&<div className="studio-empty"><Search size={28}/><h3>No matching subjects yet</h3><p>Try another search, or use the semester notes library below.</p><button onClick={()=>{setQuery("");setFilter("all");}}>Show all subjects</button></div>}
    </section>
    <Link className="studio-library-link" to="/notes"><GraduationCap size={30}/><span><strong>Looking for your semester’s notes?</strong><small>Your branch outlines, published PDFs, previous-year questions, saved units and revision worksheets are all here.</small></span><ArrowRight size={20}/></Link>
    <p className="studio-footnote">Collections include the lectures currently published on the channel, ordered for study. Unit coverage is shown above; a collection is not a claim of complete syllabus coverage. Study progress is self-recorded.</p>
  </div></main>;
}
