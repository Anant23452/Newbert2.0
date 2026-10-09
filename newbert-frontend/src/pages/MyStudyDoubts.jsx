import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hook/useAuth';
import API from '../Services/api';
import { DoubtCard } from '../components/LessonLearningTools';
import LecturePlayer from '../components/LecturePlayer';
import '../study.css';
export default function MyStudyDoubts() {
  const {isAuthenticated}=useAuth();
  const [selected,setSelected]=useState(null);
  const [doubts,setDoubts]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try {const {data}=await API.get('/study/my-doubts');setDoubts(data.doubts);} catch(e) {setError(e.response?.data?.message||'Your questions could not be loaded.');} finally {setLoading(false);}},[]);
  useEffect(()=>{if(isAuthenticated)void load();else setLoading(false);},[load,isAuthenticated]);
  const resolve=async d=>{try {await API.patch(`/study/doubts/${d.id}`,{resolved:!d.resolved});await load();} catch(e) {setError(e.response?.data?.message||'Status could not be changed.');}};
  return <main className="studio-page"><div className="study-admin"><Link to="/study">← Study Studio</Link><h1>My questions & mentor replies</h1>{!isAuthenticated?<p><Link to="/profile">Sign in</Link> to view your questions.</p>:<>{selected&&<section className="study-panel"><LecturePlayer key={`${selected.videoId}:${selected.seconds}`} videoId={selected.videoId} title="Question video" initialSeconds={selected.seconds}/><button className="studio-secondary" onClick={()=>setSelected(null)}>Close video</button></section>}<button className="studio-secondary" onClick={load}>Check for replies</button>{error&&<p role="alert">{error}</p>}{loading?<p role="status">Loading your questions…</p>:!doubts.length?<p>You haven’t asked a mentor yet. Open a lesson to ask your first question.</p>:doubts.map(d=><DoubtCard key={d.id} doubt={d} onResolve={resolve} onSeek={seconds=>setSelected({videoId:d.videoId,seconds})}/>)}</>}</div></main>;
}
