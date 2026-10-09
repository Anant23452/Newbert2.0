import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../Services/api';
import { DoubtCard } from '../components/LessonLearningTools';
import useAuth from '../hook/useAuth';
import LecturePlayer from '../components/LecturePlayer';
import '../study.css';
import '../study-content.css';
export default function MentorDoubts() {
  const {isAuthenticated}=useAuth();
  const [selected,setSelected]=useState(null);
  const [doubts,setDoubts]=useState([]), [status,setStatus]=useState('unanswered'), [loading,setLoading]=useState(true), [error,setError]=useState(''), [replies,setReplies]=useState({}), [busy,setBusy]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try {const {data}=await API.get('/study/mentor/doubts',{params:{status}});setDoubts(data.doubts);} catch(e) {setError(e.response?.data?.message || 'Mentor inbox could not be loaded.');} finally {setLoading(false);}},[status]);
  useEffect(()=>{if(isAuthenticated) void load();else setLoading(false);},[load,isAuthenticated]);
  const reply=async(e,d)=>{e.preventDefault();setBusy(d.id);setError('');try {await API.post(`/study/doubts/${d.id}/replies`,{text:replies[d.id]});setReplies(r=>({...r,[d.id]:''}));await load();} catch(e) {setError(e.response?.data?.message || 'Reply was not sent.');} finally {setBusy('');}};
  return <main className="studio-page"><div className="study-admin"><Link to="/admin/study">← Content dashboard</Link><h1>Mentor doubt inbox</h1><p>Private questions and replies stay visible only to the student and authorised staff.</p>{!isAuthenticated?<p><Link to="/profile">Sign in with your mentor account.</Link></p>:<>{selected&&<section className="study-panel"><LecturePlayer key={`${selected.videoId}:${selected.seconds}`} videoId={selected.videoId} title="Question video" initialSeconds={selected.seconds}/><button className="studio-secondary" onClick={()=>setSelected(null)}>Close video</button></section>}<div className="studio-filters"><button aria-pressed={status==='unanswered'} onClick={()=>setStatus('unanswered')}>Unanswered</button><button aria-pressed={status==='all'} onClick={()=>setStatus('all')}>All questions</button><button onClick={load}>Refresh</button></div>{error&&<p role="alert">{error}</p>}{loading?<p role="status">Loading questions…</p>:!doubts.length?<p>No questions in this view.</p>:doubts.map(d=><DoubtCard key={d.id} doubt={d} onSeek={seconds=>setSelected({videoId:d.videoId,seconds})} replyAction={<form className="study-form" onSubmit={e=>reply(e,d)}><label>Mentor reply<textarea required maxLength={4000} rows={3} value={replies[d.id]||''} onChange={e=>setReplies({...replies,[d.id]:e.target.value})}/></label><button disabled={Boolean(busy)||!replies[d.id]?.trim()} className="studio-primary">{busy===d.id?'Sending…':d.visibility==='private'?'Send private reply':'Reply to class discussion'}</button></form>}/>)}</>}</div></main>;
}
