import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../Services/api';
import { timeLabel } from '../utils/studyTools';
import '../study-content.css';
import LessonNotes from './LessonNotes';
import LessonPractice from './LessonPractice';

export default function LessonLearningTools({ lesson, authenticated, controller, position, scope }) {
  const [doubtsOpened,setDoubtsOpened]=useState(false),[practiceOpened,setPracticeOpened]=useState(false);
  return <section className="study-learning-tools">
    <LessonNotes key={lesson.videoId} lesson={lesson}/>
    <details className="lesson-fold" onToggle={e=>{if(e.currentTarget.open)setPracticeOpened(true);}}><summary>Practice this chapter <span>{(lesson.quiz?.length || 0)+(lesson.practice?.length || 0)} questions</span></summary>{practiceOpened&&<><LessonPractice lesson={lesson} authenticated={authenticated} scope={scope}/>{Boolean(lesson.quiz?.length)&&<LessonQuiz key={lesson._id || lesson.videoId} lesson={lesson} authenticated={authenticated}/>}</>}</details>
    <details className="lesson-fold" onToggle={e=>{if(e.currentTarget.open)setDoubtsOpened(true);}}><summary>Ask a doubt</summary>{doubtsOpened&&<LessonDoubts videoId={lesson.videoId} authenticated={authenticated} onSeek={seconds=>controller.current?.seek(seconds)} currentTime={()=>Math.floor(controller.current?.time() ?? position?.current ?? 0)}/>}</details>
  </section>;
}
export function DoubtCard({ doubt, onResolve, onSeek, replyAction }) {
  return <article className="study-doubt-card">
    <div className="study-row"><strong>{doubt.author}</strong><span>{doubt.visibility==='private'?'Private to mentor':'Class discussion'} · {doubt.resolved?'Resolved':doubt.replies?.length?'Answered':'Awaiting reply'}</span></div>
    <button className="studio-timestamp" onClick={()=>onSeek?.(doubt.seconds)}>{timeLabel(doubt.seconds)} · Open this moment</button>
    <p className="study-summary">{doubt.text}</p>
    {doubt.replies?.map((r,i)=><div className="study-mentor-reply" key={i}><strong>{r.author} · Mentor reply</strong><p className="study-summary">{r.text}</p></div>)}
    {doubt.isMine&&onResolve&&<button className="studio-secondary" onClick={()=>onResolve(doubt)}>{doubt.resolved?'Still need help':'Mark resolved'}</button>}
    {replyAction}
  </article>;
}
function LessonDoubts({ videoId, authenticated, currentTime, onSeek }) {
  const [doubts,setDoubts]=useState([]), [loading,setLoading]=useState(true), [error,setError]=useState('');
  const [text,setText]=useState(''), [seconds,setSeconds]=useState(0), [visibility,setVisibility]=useState('public'), [busy,setBusy]=useState(false), [filter,setFilter]=useState('all');
  const load=useCallback(async()=>{setLoading(true);setError('');try {const {data}=await API.get(`/study/videos/${videoId}/doubts`);setDoubts(data.doubts);} catch(e) {setError(e.response?.data?.message || 'Questions could not be loaded.');} finally {setLoading(false);}},[videoId]);
  useEffect(()=>{void load();},[load]);
  const ask=async e=>{e.preventDefault();setBusy(true);setError('');try {const {data}=await API.post(`/study/videos/${videoId}/doubts`,{text,seconds:Number(seconds),visibility});setDoubts(items=>[data.doubt,...items]);setText('');} catch(e) {setError(e.response?.data?.message || 'Question was not sent. Your text is still here.');} finally {setBusy(false);}};
  const resolve=async d=>{setBusy(true);try {const {data}=await API.patch(`/study/doubts/${d.id}`,{resolved:!d.resolved});setDoubts(items=>items.map(item=>item.id===d.id?data.doubt:item));} catch(e) {setError(e.response?.data?.message || 'Status could not be changed.');} finally {setBusy(false);}};
  const visible=doubts.filter(d=>filter==='all'||filter==='mine'&&d.isMine||filter==='unanswered'&&!d.replies.length||filter==='answered'&&d.replies.length);
  return <div className="study-tool-body"><h2>Ask your mentor</h2><p>Attach your question to the video moment you need help with.</p>
    {authenticated ? <form onSubmit={ask} className="study-form"><fieldset disabled={busy}><div className="study-row"><button type="button" className="studio-secondary" onClick={()=>setSeconds(currentTime())}>Use current video time</button><label>Timestamp (seconds)<input type="number" min="0" max="86400" required value={seconds} onChange={e=>setSeconds(e.target.value)}/></label></div><label>Your question<textarea required maxLength={2000} rows={3} value={text} onChange={e=>setText(e.target.value)} placeholder="What have you tried, and where are you stuck?"/></label><label>Who can see it?<select value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="public">Class discussion</option><option value="private">Private to mentor</option></select></label><button className="studio-primary" disabled={!text.trim()}>{busy?'Sending…':'Ask mentor'}</button></fieldset></form> : <p><Link to="/profile">Sign in</Link> to ask a mentor and track replies.</p>}
    {error&&<p role="alert" className="studio-notice">{error}<button disabled={busy} onClick={load}>Retry loading questions</button></p>}
    <div className="studio-filters">{[['all','All'],['unanswered','Unanswered'],['answered','Answered'],['mine','My questions']].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</div>
    {loading?<p role="status">Loading questions…</p>:error?null:visible.length?visible.map(d=><DoubtCard key={d.id} doubt={d} onResolve={busy?undefined:resolve} onSeek={onSeek}/>):<p>No questions in this view yet.</p>}
  </div>;
}
export function LessonQuiz({ lesson, authenticated }) {
  const quiz=lesson.quiz || [];
  const [answers,setAnswers]=useState({}), [result,setResult]=useState(null), [error,setError]=useState(''), [busy,setBusy]=useState(false);
  const submit=async e=>{e.preventDefault();setBusy(true);setError('');try {const {data}=await API.post(`/study/lessons/${lesson._id}/quiz`,{answers:quiz.map((_,i)=>answers[i])});setResult(data);} catch(e) {setError(e.response?.data?.message || 'Practice could not be checked.');} finally {setBusy(false);}};
  return <div className="study-tool-body"><h2>Check what you understood.</h2>{!quiz.length?<p>No lesson quiz has been published yet. Try the unit’s existing recall exercise.</p>:!authenticated?<p><Link to="/profile">Sign in</Link> to attempt this lesson quiz.</p>:<form onSubmit={submit} className="study-form">{quiz.map((q,i)=><fieldset key={i} disabled={busy||Boolean(result)}><legend>{i+1}. {q.question}</legend>{q.options.map((option,index)=><label className="study-quiz-option" key={index}><input required type="radio" name={`question-${i}`} checked={answers[i]===index} onChange={()=>setAnswers({...answers,[i]:index})}/>{option}</label>)}{result&&<div className="study-mentor-reply"><strong>{result.results[i].passed?'Correct':'Revisit this idea'} · Answer: {q.options[result.results[i].correct]}</strong><p>{result.results[i].explanation}</p></div>}</fieldset>)}{result?<><p role="status">{result.score} of {result.total} correct.</p><button type="button" className="studio-secondary" onClick={()=>{setResult(null);setAnswers({});}}>Try again</button></>:<button disabled={busy||Object.keys(answers).length!==quiz.length} className="studio-primary">{busy?'Checking…':'Check answers'}</button>}{error&&<p role="alert">{error}</p>}</form>}</div>;
}
