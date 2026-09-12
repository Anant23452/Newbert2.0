import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CircuitBoard, Code2, Construction, Play, RotateCcw } from 'lucide-react';
import useAuth from '../hook/useAuth';
import useAcademicProgress from '../hook/useAcademicProgress';
import { academicBranches, inferAcademicYear, profileBranch } from '../utils/academicYear';
import { isReviewDue } from '../utils/studyTools';
import { resumableRecords, resumeHref, studyRecordTitle } from '../data/academicStudy';
import '../study.css';
import '../academic.css';
const icons = { 'information-technology':Code2, civil:Construction, electrical:CircuitBoard };
export default function AcademicHome() {
  const { profile } = useAuth();
  const progress = useAcademicProgress();
  const academic = inferAcademicYear(profile?.graduationYear);
  const branch = profileBranch(profile?.branch);
  const records = resumableRecords(progress.records);
  const recent = records.find(r => !r.completed);
  const due = records.filter(isReviewDue);
  return <main className="studio-page academic-page"><div className="studio-shell">
    <header className="academic-hero"><div><p className="studio-eyebrow">NEWBERT / STUDY STUDIO</p><h1>Your year.<br/><span>Your next breakthrough.</span></h1><p>{profile?.name ? `${profile.name.split(' ')[0]}, your` : 'Your'} subjects, lectures and own thinking, together. Start with your branch. Move through one unit at a time.</p><div className="academic-badges"><span>{academic.session}</span>{academic.year ? <span>Class of {profile.graduationYear} · Year {academic.year}</span> : <Link to="/profile">Add your graduation year for a personal starting point <ArrowRight size={13}/></Link>}</div></div><div className="academic-orbit" aria-hidden="true"><div className="academic-orbit-core"><BookOpen size={32}/><b>{academic.year ? `YEAR ${academic.year}` : 'YOUR PATH'}</b><small>learn · apply · recall</small></div>{[1,2,3,4].map(y=><span className={`orbit-year orbit-${y} ${academic.year===y?'active':''}`} key={y}>{String(y).padStart(2,'0')}</span>)}</div></header>
    {progress.error && <div className="studio-notice" role="alert">{progress.error}<button onClick={progress.retry}>Retry</button></div>}
    <section className="academic-branches" aria-label="Choose your branch">{academicBranches.map((b,i)=>{const Icon=icons[b.id];return <Link className={`academic-branch-card branch-${i} ${branch===b.id?'your-branch':''}`} to={`/study/branch/${b.id}`} key={b.id}><div className="academic-branch-top"><Icon size={29}/><span>{branch===b.id?'YOUR BRANCH':b.code}</span></div><h2>{b.name}</h2><p>{b.description}</p><div className="academic-branch-path" aria-hidden="true">{[1,2,3,4].map(y=><span className={y===academic.year?'active':''} key={y}>{y}</span>)}</div><div className="studio-course-cta">{academic.year?`Open Year ${academic.year}`:'Explore Years 1–4'}<ArrowRight size={19}/></div></Link>;})}</section>
    <section className="studio-return-grid"><div className="studio-return"><p className="studio-eyebrow">{recent?'PICK UP YOUR THREAD':'A SMALL START, EVERY DAY'}</p><h2>{recent?studyRecordTitle(recent.key):'One unit. One idea you can explain.'}</h2><p>{recent?'Your notes, saved place and next recall stay with your classroom.':'Choose a unit, work through an example, then explain it without looking. Your progress starts with what you actually do.'}</p><Link className="studio-primary" to={recent?resumeHref(recent):`/study/branch/${branch||'information-technology'}`}><Play size={15}/>{recent?'Continue studying':'Find my subjects'}</Link></div><div className="studio-review-card"><div className="studio-heading"><h2><RotateCcw size={18}/>Ready for another pass</h2><span>{due.length} due</span></div>{due.length?due.slice(0,3).map(r=><Link to={resumeHref(r)} key={r.key}><span>{studyRecordTitle(r.key)}<small>{r.confidence==='again'?'You wanted to revisit this':'Your next recall is due'}</small></span><ArrowRight size={16}/></Link>):<p>Use the recall check inside a unit. Your own rating decides when it comes back here.</p>}</div></section>
    <div className="academic-shortcuts"><Link to="/study/lectures"><Play size={22}/><span><strong>Newbert lecture library</strong><small>All published collections, including archived revision</small></span><ArrowRight size={18}/></Link><Link to="/notes"><BookOpen size={22}/><span><strong>Semester notes & papers</strong><small>Your existing PDFs, saved units and worksheets</small></span><ArrowRight size={18}/></Link></div>
    <p className="studio-footnote">Year is estimated from a four-year B.Tech and a July academic-session boundary. Change your study year inside any branch. AKTU elective choices and semester groups depend on your college.</p>
  </div></main>;
}
