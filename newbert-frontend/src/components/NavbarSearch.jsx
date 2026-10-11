import {useEffect,useRef,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {Search,X} from 'lucide-react';
import API from '../Services/api';

const pages=[['Study Studio','/study'],['Jobs & internships','/jobs'],['My Plan','/roadmap'],['Alumni & seniors','/alumni-wall'],['Courses','/courses'],['Leaderboard','/leaderboard'],['My profile','/profile'],['Resume AI','/resume-ai'],['Mentorship','/mentorship']];
export default function NavbarSearch(){
 const [q,setQ]=useState(''),[open,setOpen]=useState(false),[results,setResults]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const root=useRef(null),input=useRef(null),location=useLocation();
 useEffect(()=>{setOpen(false);},[location.pathname,location.search]);
 useEffect(()=>{const outside=e=>{if(!root.current?.contains(e.target))setOpen(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[]);
 useEffect(()=>{
  const controller=new AbortController();setResults([]);setError('');
  if(q.trim().length<2){setBusy(false);return()=>controller.abort();}
  setBusy(true);
  const timer=setTimeout(async()=>{try{const {data}=await API.get('/search',{params:{q:q.trim()},signal:controller.signal});if(!controller.signal.aborted)setResults(data.results || []);}catch(e){if(!controller.signal.aborted&&e.code!=='ERR_CANCELED')setError('Search could not load. Try typing again.');}finally{if(!controller.signal.aborted)setBusy(false);}},300);
  return()=>{clearTimeout(timer);controller.abort();};
 },[q]);
 const shortcuts=pages.filter(([title])=>title.toLowerCase().includes(q.trim().toLowerCase())).map(([title,url])=>({title,url,type:'Page'}));
 const shown=[...shortcuts,...results];
 return <div className="navbar-search-row"><div className="navbar-search" ref={root} onKeyDown={e=>{if(e.key==='Escape'){input.current?.focus();setOpen(false);}if(e.key==='ArrowDown'&&e.target===input.current){e.preventDefault();root.current.querySelector('.navbar-search-results a')?.focus();}}}>
  <Search size={16} aria-hidden="true"/><input ref={input} value={q} maxLength={80} onChange={e=>{setQ(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} aria-label="Search students, seniors, colleges and lectures" aria-expanded={open} aria-controls="navbar-search-results" placeholder="Search students, seniors, colleges, lectures…"/>{q&&<button type="button" aria-label="Clear search" onClick={()=>{setQ('');input.current?.focus();}}><X size={15}/></button>}
  {open&&<div id="navbar-search-results" className="navbar-search-results"><p role="status">{busy?'Searching…':error || (q.trim().length<2?'Find a page, or type at least two letters to search people and lectures.':!shown.length?'No matches. Try a name, college or subject.':`${shown.length} results`)}</p>{shown.map((r,i)=><Link key={`${r.type}:${r.url}:${i}`} to={r.url} onClick={()=>setOpen(false)}><span className="navbar-search-kind">{r.type}</span><span><strong>{r.title}</strong>{r.detail&&<small>{r.detail}</small>}</span></Link>)}</div>}
 </div></div>;
}
