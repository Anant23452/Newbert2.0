import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Play } from 'lucide-react';
import useAuth from '../hook/useAuth';
import useAcademicProgress from '../hook/useAcademicProgress';
import { academicBranches, academicSubjectHref, academicUnitKey } from '../utils/academicYear';
import { academicCatalog, findSubject, lessonsForUnit, subjectProgress } from '../data/academicStudy';
import UnitWorkspace from '../components/UnitWorkspace';
import '../study.css';
import '../academic.css';
export default function AcademicSubject() {
  const {branchId,subjectId}=useParams();
  const [params]=useSearchParams();
  const {profile,isAuthenticated}=useAuth();
  const progress=useAcademicProgress();
  const subject=findSubject(branchId,subjectId);
  const branch=academicBranches.find(b=>b.id===branchId);
  if(!subject)return <main className="studio-page"><div className="studio-shell studio-empty"><h1>Subject not found in this branch</h1><Link to="/study">Choose your branch</Link></div></main>;
  const unit=subject.units.find(u=>u.number===Number(params.get('unit')));
  const source=academicCatalog.sources[subject.source];
  const back=`/study/branch/${branchId}?year=${subject.year}&semester=${subject.semesters[0]}&scheme=${subject.scheme}`;
  if(unit)return <UnitWorkspace key={`${isAuthenticated?profile?.userId:'guest'}:${branchId}:${subjectId}:${unit.number}`} subject={subject} unit={unit} branch={branch} source={source} scope={progress.scope} authenticated={isAuthenticated}/>;
  const done=subjectProgress(branchId,subject,progress.records);
  return <main className="studio-page academic-page"><div className="studio-shell"><div className="academic-breadcrumb"><Link to={back}><ArrowLeft size={15}/>{branch.code} · Year {subject.year}</Link><span>{subject.code}</span></div><header className="academic-subject-header"><div><p className="studio-eyebrow">YEAR {subject.year} / SEMESTER {subject.semesters.join(' OR ')} / {subject.kind==='open'?'OPEN ELECTIVE':subject.kind==='elective'?'DEPARTMENT ELECTIVE':'SUBJECT'}</p><h1>{subject.title}</h1><p>Five units. A clear place to begin, a notebook that stays with you, and room to work things out.</p><a href={source.url} target="_blank" rel="noreferrer">AKTU {source.edition} syllabus · {subject.code} ↗</a></div><div className="academic-progress-ring" style={{'--progress':`${done/5*100}%`}}><span><b>{done}<small>/ 5</small></b><small>units complete</small></span></div></header>{params.has('unit')&&!unit&&<p className="studio-notice" role="alert">That unit is unavailable. Choose a unit below.</p>}{progress.error&&<p className="studio-notice" role="alert">{progress.error}<button onClick={progress.retry}>Retry</button></p>}<section className="academic-unit-path" aria-label="Subject units">{subject.units.map(u=>{const lessons=lessonsForUnit(subject,u.number);const record=progress.records.find(r=>r.key===academicUnitKey(branchId,subject.id,u.number));return <Link key={u.number} to={academicSubjectHref(branchId,subject.id,u.number)} className={`academic-unit-card ${record?.completed?'complete':''}`}><span className="academic-unit-number">{record?.completed?<Check/>:`0${u.number}`}</span><div><p className="studio-eyebrow">UNIT {u.number}{record?.confidence?` · ${record.confidence==='again'?'ANOTHER PASS':record.confidence==='solid'?'CAN EXPLAIN IT':'GETTING THERE'}`:''}</p><h2>{u.title}</h2><p>{lessons.length?<><Play size={13}/>{lessons.length} published channel {lessons.length===1?'lesson':'lessons'} · notes & practice</>:'Syllabus, personal notes & AI study help · video not listed yet'}</p></div><ArrowRight size={21}/></Link>;})}</section><div className="academic-source-strip"><span><strong>Your progress means what you’ve done.</strong><small>Completion and confidence come from your own checks. The unit outline follows the linked AKTU edition; published video coverage is shown separately.</small></span><Link to={`/notes/${branchId}`}>Branch PDFs & past papers <ArrowRight size={14}/></Link></div></div></main>;
}
