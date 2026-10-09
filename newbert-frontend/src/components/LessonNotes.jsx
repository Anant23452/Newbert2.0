import { useRef, useState } from 'react';
import { pdfPreviewUrl } from '../utils/lessonPdf';
export default function LessonNotes({lesson}) {
  const [selected,setSelected]=useState(null),[message,setMessage]=useState('');
  const reader=useRef(null);
  const resources=lesson.resources || [];
  const fullscreen=async()=>{try {await reader.current?.requestFullscreen();}catch {setMessage('Fullscreen is unavailable in this browser. You can still read below.');}};
  return <section className="study-tool-body lesson-notes"><h2>Lesson notes</h2>{resources.length?<ul className="lesson-document-list">{resources.map((r,i)=>{const preview=pdfPreviewUrl(r);return <li key={`${r.url}:${i}`}><span><strong>{r.title}</strong><small>{preview?'PDF':r.kind.replace('-',' ')}</small></span>{preview?<button className="studio-secondary" aria-expanded={selected===i} onClick={()=>{setSelected(selected===i?null:i);setMessage('');}}>{selected===i?'Close':'Read here'}</button>:<a href={r.url} target="_blank" rel="noopener noreferrer">Open link ↗</a>}</li>;})}</ul>:<p>PDF notes will appear here when the mentor attaches them.</p>}
    {selected!==null&&resources[selected]&&<div className="lesson-pdf-reader" ref={reader}><div className="study-row"><strong>{resources[selected].title}</strong><div><button onClick={fullscreen}>Fullscreen</button><a href={resources[selected].url} download target="_blank" rel="noopener noreferrer">Download / original ↗</a><button onClick={()=>setSelected(null)}>Close reader</button></div></div><iframe title={`PDF notes: ${resources[selected].title}`} src={pdfPreviewUrl(resources[selected])} loading="lazy" referrerPolicy="no-referrer"/><p>Read without leaving the lesson. If the host blocks the preview, use the original link above.</p>{message&&<p role="status">{message}</p>}</div>}
  </section>;
}
