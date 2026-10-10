import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';
import useStudyCatalog from '../hook/useStudyCatalog';
import { findSubject, lessonsForUnit, studyRecordTitle } from '../data/academicStudy';
import { studyCourses, studyHref } from '../data/studyCatalog';
import { LessonQuiz } from './LessonLearningTools';
import LessonPractice from './LessonPractice';

export default function HomeStudyReview({study,scope}) {
  const content=useStudyCatalog();
  const [opened,setOpened]=useState(false);
  if(!study?.key || content.loading)return null;
  const parts=study.key.split(':');
  const subject=parts[0]==='unit' ? findSubject(parts[1],parts[2]) : null;
  const lesson=subject ? lessonsForUnit(subject,Number(parts[3]))[0] : parts[0]==='lecture' ? studyCourses.find(c=>c.id===parts[1])?.lessons.find(l=>l.videoId===parts[2]) : null;
  const title=studyRecordTitle(study.key);
  if(!title)return null;
  const quiz=lesson?.quiz?.length>0, practice=lesson?.practice?.length>0;
  return <section className="home-study-review" aria-label="Review your recent chapter">
    <div className="today-section-heading"><h2><BookOpen size={19}/>Back to your chapter</h2><Link to={studyHref(study.key)}>Open lesson <ArrowRight size={15}/></Link></div>
    <h3>{title}</h3>
    <div className="home-study-actions"><Link to={studyHref(study.key)}>Video & notes <ArrowRight size={15}/></Link>{(quiz||practice)&&<button type="button" aria-expanded={opened} onClick={()=>setOpened(!opened)}>{opened?'Close practice':'Try chapter questions'}</button>}</div>
    {opened&&lesson&&<div key={lesson.videoId}>{quiz&&<LessonQuiz lesson={lesson} authenticated/>}{practice&&<LessonPractice lesson={lesson} authenticated scope={scope}/>}</div>}
    {!quiz&&!practice&&<p className="today-muted">Chapter questions will appear here when a mentor publishes them.</p>}
  </section>;
}
