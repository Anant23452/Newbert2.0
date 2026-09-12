import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bookmark, Check, Search } from 'lucide-react';
import useAuth from '../hook/useAuth';
import useAcademicProgress from '../hook/useAcademicProgress';
import { academicBranches, academicSubjectHref, inferAcademicYear, validSemester, validYear } from '../utils/academicYear';
import { academicCatalog, lessonsForUnit, subjectProgress, subjectsFor } from '../data/academicStudy';
import { readStudyLocal, writeStudyLocal } from '../utils/studyTools';
import '../study.css';
import '../academic.css';

export default function AcademicBranch() {
  const { branchId } = useParams();
  const { profile, isAuthenticated } = useAuth();
  const branch = academicBranches.find(b => b.id === branchId);
  if (!branch) return <main className="studio-page"><div className="studio-shell studio-empty"><h1>Branch not found</h1><Link to="/study">Choose a branch</Link></div></main>;
  return <BranchShelf key={`${isAuthenticated?profile?.userId:'guest'}:${branchId}`} branch={branch} profile={profile}/>;
}
function BranchShelf({ branch, profile }) {
  const progress = useAcademicProgress();
  const academic = inferAcademicYear(profile?.graduationYear);
  const preferenceKey = `newbert-academic:${progress.scope}:${academic.session}`;
  const [myYear, setMyYear] = useState(()=>validYear(readStudyLocal(preferenceKey, null)) || academic.year);
  const [params, setParams] = useSearchParams();
  const year = validYear(params.get('year')) || myYear || 1;
  const semester = validSemester(params.get('semester'), year);
  const scheme = params.get('scheme')==='2026' ? 2026 : params.get('scheme')==='2022' ? 2022 : Number(profile?.graduationYear)>=2030 || !profile?.graduationYear ? 2026 : 2022;
  const savedKey = `newbert-electives:${progress.scope}:${branch.id}`;
  const [selected,setSelected] = useState(()=>{const v=readStudyLocal(savedKey,[]);return Array.isArray(v)?v:[];});
  const [query,setQuery] = useState('');
  const [filter,setFilter] = useState('all');
  const [storageError,setStorageError] = useState('');
  const all = subjectsFor(branch.id,year,semester,scheme);
  const subjects = all.filter(s => `${s.title} ${s.code}`.toLowerCase().includes(query.toLowerCase()) && (filter==='all' || filter==='my' && (s.kind==='core'||s.kind==='paired'||selected.includes(s.id)) || filter===s.kind));
  const sourceId = year===1 ? scheme===2026 ? ({civil:'civil26',electrical:'ee26','information-technology':'it26'})[branch.id] : 'common1' : `${({civil:'civil',electrical:'ee','information-technology':'it'})[branch.id]}${year}`;
  const source = academicCatalog.sources[sourceId];
  const navigateYear = y => {setParams({year:String(y),semester:String(y*2-1),scheme:String(scheme)});setQuery('');setFilter('all');};
  const chooseElective = id => {const next=selected.includes(id)?selected.filter(s=>s!==id):[...selected,id];setSelected(next);if(!writeStudyLocal(savedKey,next))setStorageError('This browser could not save your subject choices. They remain selected while this page is open.');};
  return <main className="studio-page academic-page"><div className="studio-shell">
    <div className="academic-breadcrumb"><Link to="/study"><ArrowLeft size={15}/>Study Studio</Link><span>{branch.code}</span></div>
    <header className="academic-shelf-header"><div><p className="studio-eyebrow">{academic.session} / YOUR COURSE SHELF</p><h1>{branch.name}</h1><p>{myYear ? `Your starting point is Year ${myYear}${academic.year===myYear&&profile?.graduationYear?` · Class of ${profile.graduationYear}`:' · your study preference'}. All four years are open to you.` : 'Choose the year you are studying. Every year remains open to explore.'}</p></div><label className="academic-year-preference">My current study year<select aria-label="My current study year" value={myYear||''} onChange={e=>{const value=Number(e.target.value);setMyYear(value);navigateYear(value);if(!writeStudyLocal(preferenceKey,value))setStorageError('Your study year could not be saved on this browser.');}}><option value="" disabled>Choose year</option>{[1,2,3,4].map(y=><option value={y} key={y}>Year {y}{academic.year===y?' · from my profile':''}</option>)}</select><small>Preference on this device</small></label></header>
    <nav className="academic-years" aria-label="Study year">{[1,2,3,4].map(y=><button key={y} aria-current={y===year?'page':undefined} onClick={()=>navigateYear(y)}><span>0{y}</span><strong>Year {y}</strong><small>{y===myYear?'Your current year':`Semesters ${2*y-1} & ${2*y}`}</small>{y===year&&<ArrowRight size={19}/>}</button>)}</nav>
    <div className="academic-semester-bar"><div className="studio-filters" role="group" aria-label="Semester">{[year*2-1,year*2].map(s=><button aria-pressed={semester===s} key={s} onClick={()=>{const next=new URLSearchParams(params);next.set('year',String(year));next.set('semester',String(s));setParams(next);}}>Semester {s}</button>)}</div>{myYear&&year!==myYear&&<button className="studio-secondary" onClick={()=>navigateYear(myYear)}>Return to my year</button>}{year===1&&<label>First-year curriculum<select aria-label="First-year curriculum" value={scheme} onChange={e=>{const next=new URLSearchParams(params);next.set('scheme',e.target.value);setParams(next);}}><option value="2022">2022 scheme · earlier batches</option><option value="2026">2026 scheme · new intake</option></select></label>}</div>
    <div className="academic-source-strip"><span><strong>AKTU · {source.edition}–{String(source.edition+1).slice(-2)} edition</strong><small>{year===4&&semester===8?'Final semester: open electives and project work.':'Core subjects plus the published elective choices.'} Paired papers follow your college’s semester group.</small></span><a href={source.url} target="_blank" rel="noreferrer">Official syllabus ↗</a></div>
    {storageError&&<p className="studio-notice" role="alert">{storageError}</p>}{progress.error&&<p className="studio-notice" role="alert">{progress.error}<button onClick={progress.retry}>Retry</button></p>}
    <div className="studio-heading academic-catalog-heading"><div><p className="studio-eyebrow">YEAR {year} / SEMESTER {semester}</p><h2>Make room for what you’re studying.</h2></div><label className="studio-search"><Search size={17}/><input aria-label="Search this semester" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Subject or course code…"/></label></div>
    <div className="studio-filters" role="group" aria-label="Subject type">{[['all','All subjects'],['my','My subjects'],['core','Core'],['elective','Department electives'],['open','Open electives']].map(([id,label])=><button aria-pressed={filter===id} key={id} onClick={()=>setFilter(id)}>{label}</button>)}</div>
    <div className="academic-subjects">{subjects.map(s=>{const complete=subjectProgress(branch.id,s,progress.records);const videos=s.units.reduce((n,u)=>n+lessonsForUnit(s,u.number).length,0);const elective=['elective','open'].includes(s.kind);return <article className="academic-subject-card" key={s.id}><div className="academic-subject-meta"><span>{s.code} · {s.kind==='open'?'Open elective':s.kind==='elective'?'Dept. elective':s.kind==='paired'?'College group':'Core'}</span>{elective&&<button aria-label={`${selected.includes(s.id)?'Remove':'Add'} ${s.title} ${s.code} ${selected.includes(s.id)?'from':'to'} my subjects`} aria-pressed={selected.includes(s.id)} onClick={()=>chooseElective(s.id)}>{selected.includes(s.id)?<Check size={17}/>:<Bookmark size={17}/>}</button>}</div><Link to={academicSubjectHref(branch.id,s.id)}><h3>{s.title}</h3><p>{s.units[0].title} → {s.units[4].title}</p><div className="academic-unit-dots" aria-label={`${complete} of 5 units marked complete`}>{s.units.map(u=><span key={u.number} className={progress.records.some(r=>r.key===`unit:${branch.id}:${s.id}:${u.number}`&&r.completed)?'done':''}/>)}</div><div className="academic-subject-bottom"><small>{complete}/5 units · {videos?`${videos} channel lessons`:'Syllabus & workspace'}</small><ArrowRight size={19}/></div></Link></article>;})}</div>
    {!subjects.length&&<div className="studio-empty"><Search size={24}/><h3>No subjects match this view</h3><button className="studio-secondary" onClick={()=>{setQuery('');setFilter('all');}}>Show all semester subjects</button></div>}
    <div className="academic-practical"><div><p className="studio-eyebrow">BEYOND THEORY</p><h3>{year===4?'Projects, internship & practical work':'Labs, workshops & practical work'}</h3><p>Your official scheme lists practical credits, projects and elective eligibility. Practical papers follow your college’s activities and assessment, rather than a five-unit lecture structure.</p></div><div><a href={source.url} target="_blank" rel="noreferrer">View practical requirements ↗</a><Link to={`/notes/${branch.id}`}>Open branch notes & papers <ArrowRight size={15}/></Link>{year===2&&<a href={academicCatalog.sources.elective2.url} target="_blank" rel="noreferrer">All second-year open electives ↗</a>}{year===3&&semester===6&&<a href={academicCatalog.sources.elective3.url} target="_blank" rel="noreferrer">All semester 6 open electives ↗</a>}{year===4&&<a href={academicCatalog.sources[`open${semester}`].url} target="_blank" rel="noreferrer">Full open-elective scheme & eligibility ↗</a>}</div></div>
    <p className="studio-footnote">“My subjects” includes core/group papers and electives you select on this device. College offerings vary; avoid selecting an open elective you have already studied. Unit headings are condensed syllabus outlines. Video availability is shown separately.</p>
  </div></main>;
}
