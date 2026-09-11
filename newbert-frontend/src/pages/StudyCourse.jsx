import { useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Check, Download, Expand, HelpCircle, MessageSquare, Minimize, Plus, RotateCcw } from "lucide-react";
import useAuth from "../hook/useAuth";
import useStudyProgress from "../hook/useStudyProgress";
import useLectureNotebook from "../hook/useLectureNotebook";
import LecturePlayer from "../components/LecturePlayer";
import { channelUrl, lectureKey, lessonHref, studyCourses } from "../data/studyCatalog";
import { studyGuides } from "../data/studyGuides";
import { downloadText, mergeStudySummaries, readStudyLocal, timeLabel } from "../utils/studyTools";
import "../study.css";

export default function StudyCourse() {
  const { courseId } = useParams();
  const [params, setParams] = useSearchParams();
  const { profile, isAuthenticated } = useAuth();
  const progress = useStudyProgress();
  const course = studyCourses.find((c)=>c.id===courseId);
  if (!course) return <main className="studio-page"><div className="studio-shell studio-empty"><h1>Subject not found</h1><Link to="/study">Back to Study Studio</Link></div></main>;
  const lesson = course.lessons.find((l)=>l.videoId===params.get("lesson")) || course.lessons[0];
  const scope = isAuthenticated ? profile.userId : "guest";
  return <Classroom key={`${scope}:${course.id}:${lesson.videoId}`} course={course} lesson={lesson} scope={scope} authenticated={isAuthenticated} summaries={progress.records} select={(id)=>setParams({lesson:id})}/>;
}

function Classroom({ course, lesson, scope, authenticated, summaries, select }) {
  const notebook = useLectureNotebook(lectureKey(course.id,lesson.videoId),scope,authenticated);
  const { record, update } = notebook;
  const guide = studyGuides[course.id];
  const controller = useRef(null);
  const position = useRef(record.positionSeconds || 0);
  const [tab, setTab] = useState("notes");
  const [focus, setFocus] = useState(false);
  const [text, setText] = useState("");
  const [kind, setKind] = useState("note");
  const [showAnswer, setShowAnswer] = useState(false);
  const [noteError, setNoteError] = useState("");
  const local = readStudyLocal(`newbert-lecture-index:${scope}`,[]);
  const records = new Map([...mergeStudySummaries(summaries,Array.isArray(local)?local:[]),record].map(r=>[r.key,r]));
  const notes = record.notes || [];
  const done = course.lessons.filter(l=>records.get(lectureKey(course.id,l.videoId))?.completed).length;
  const next = course.lessons[course.lessons.indexOf(lesson)+1];
  const addNote = () => {
    if (!text.trim()) { setNoteError("Write a note or question first."); return; }
    if(notes.length>=80) { setNoteError("This lecture has 80 notes. Edit an existing note or export your notebook."); return; }
    const seconds = controller.current?.time() ?? position.current;
    update({notes:[...notes,{id:crypto.randomUUID(),seconds:Math.floor(seconds),text:text.trim(),kind,resolved:false}]});
    setText(""); setNoteError("");
  };
  const exportNotebook = () => downloadText(`${course.id}-${lesson.videoId}-notebook.md`, `# ${course.title}\n## ${lesson.title}\n${lesson.url}\n\n## My timestamp notes\n${notes.map(n=>`- [${timeLabel(n.seconds)}](${lesson.url}&t=${Math.floor(n.seconds)}s) ${n.kind==='question'?'Question: ':''}${n.text}${n.resolved?' (resolved)':''}`).join('\n')}\n\n## My recall answer\n${record.reflection||'Not written yet.'}\n\n## Subject companion (not a lecture transcript)\n${guide.concepts.map(([title,body])=>`### ${title}\n${body}`).join('\n\n')}\n\nWorked example: ${guide.example}\n`);
  return <main className={`studio-page studio-classroom ${focus?'studio-focus-mode':''}`}><div className="studio-shell">
    <div className="studio-classroom-top"><Link to="/study"><ArrowLeft size={16}/>Study Studio</Link><button onClick={()=>setFocus(!focus)}>{focus?<Minimize size={15}/>:<Expand size={15}/>} {focus?'Show lesson list':'Focus view'}</button></div>
    <header className="studio-course-header"><p className="studio-eyebrow">{course.audience} / {lesson.unit ? `UNIT ${lesson.unit}` : 'ARCHIVED REVISION'}</p><h1>{course.title}</h1><p>{lesson.title}</p></header>
    <div className="studio-classroom-grid">
      {!focus&&<aside className="studio-syllabus"><div className="studio-heading"><h2>Lesson path</h2><span>{done}/{course.lessons.length}</span></div><progress max={course.lessons.length} value={done} aria-label="Course lessons completed"/><div className="studio-lesson-list">{course.lessons.map((item,index)=>{const saved=records.get(lectureKey(course.id,item.videoId));return <button key={item.videoId} aria-current={lesson.videoId===item.videoId?'step':undefined} onClick={()=>select(item.videoId)}><span className="studio-step-number">{saved?.completed?<Check size={15}/>:String(index+1).padStart(2,'0')}</span><span><strong>{item.title}</strong><small>~{item.minutes} min{saved?.positionSeconds>0&&!saved.completed?` · resume ${timeLabel(saved.positionSeconds)}`:''}</small></span></button>;})}</div><p className="studio-footnote">Only published lessons are listed. Follow your own syllabus for any remaining units.</p><a href={course.playlistUrl} target="_blank" rel="noreferrer">Original playlist ↗</a><Link to="/notes">Semester notes library <ArrowRight size={14}/></Link></aside>}
      <div className="studio-lesson-workspace">
        {notebook.loading?<div className="studio-player-placeholder" role="status">Opening your saved classroom…</div>:<LecturePlayer videoId={lesson.videoId} title={`${course.title}: ${lesson.title}`} initialSeconds={record.positionSeconds} controller={controller} onTime={(seconds)=>{position.current=seconds;}} onProgress={update}/>}
        <div className="studio-lesson-actions"><div><p className="studio-save-status" role="status">{notebook.status}</p><small>{authenticated?'Personal notebook · your Newbert account':'Guest notebook · this browser only'}</small></div><button disabled={notebook.loading} className={record.completed?'studio-secondary':'studio-primary'} onClick={()=>update({completed:!record.completed})}><Check size={15}/>{record.completed?'Completed · undo':'Mark lesson complete'}</button></div>
        {notebook.error&&<div className="studio-notice" role="alert">{notebook.error}<button onClick={notebook.retry}>Retry</button></div>}
        <section className="studio-notebook"><div className="studio-notebook-tabs" role="group" aria-label="Learning tools">{[['notes','My notes',BookOpen],['recall','Recall check',RotateCcw],['resources','Subject companion',HelpCircle]].map(([id,label,icon])=>{const Icon=icon;return <button key={id} aria-pressed={tab===id} onClick={()=>{controller.current?.pause();setTab(id);}}><Icon size={16}/>{label}</button>;})}<button className="studio-export" onClick={exportNotebook} aria-label="Download your notebook"><Download size={17}/></button></div>
          {tab==='notes'&&<div className="studio-notebook-body"><div className="studio-heading"><div><h2>Catch the moment it clicks.</h2><p>Each note takes you back to the moment you saved it.</p></div><MessageSquare size={23}/></div><fieldset disabled={notebook.loading} className="studio-note-composer"><legend className="sr-only">Add a timestamp note</legend><div className="studio-note-kind" role="group" aria-label="Note type"><button aria-pressed={kind==='note'} onClick={()=>setKind('note')}>An idea</button><button aria-pressed={kind==='question'} onClick={()=>setKind('question')}>A question to revisit</button></div><textarea aria-label="Your lecture note" value={text} onChange={e=>setText(e.target.value)} maxLength={1500} rows={3} placeholder="Explain it in your words, or write what is still unclear…"/><div><small>{text.length}/1500 · {notes.length}/80 notes</small><button className="studio-primary" onClick={addNote}><Plus size={15}/>Save at this moment</button></div>{noteError&&<p role="alert">{noteError}</p>}</fieldset>
            <div className="studio-note-list">{notes.length?notes.map(note=><NotebookNote key={note.id} note={note} onSeek={()=>controller.current?controller.current.seek(note.seconds):window.open(`${lesson.url}&t=${note.seconds}s`,'_blank','noopener,noreferrer')} onUpdate={(fields)=>update({notes:notes.map(n=>n.id===note.id?{...n,...fields}:n)})}/>):<div className="studio-inline-empty"><BookOpen size={25}/><p>Your first note belongs here. Pause the lecture at an idea worth keeping.</p></div>}</div>
          </div>}
          {tab==='recall'&&<div className="studio-notebook-body"><p className="studio-eyebrow">CLOSE THE NOTES. TRY FROM MEMORY.</p><h2>A subject checkpoint</h2><p className="studio-recall-question">{guide.question}</p><textarea disabled={notebook.loading} aria-label="Your recall answer" rows={5} maxLength={6000} value={record.reflection||''} onChange={e=>update({reflection:e.target.value})} placeholder="Write your reasoning before revealing the guide…"/><button className="studio-secondary" onClick={()=>setShowAnswer(!showAnswer)}>{showAnswer?'Hide answer guide':'Show answer guide'}</button>{showAnswer&&<div className="studio-answer-guide"><strong>Compare your reasoning</strong><p>{guide.answer}</p></div>}<div className="studio-recall-rating"><h3>How did that feel?</h3><p>Your own rating sets the next review. It is not a graded score.</p><div>{[['again','Another pass','Review today'],['good','Got the idea','Review in 3 days'],['solid','Can explain it','Review in 7 days']].map(([id,label,hint])=><button key={id} disabled={notebook.loading||!record.reflection?.trim()} aria-pressed={record.confidence===id} onClick={()=>update({confidence:id})}><strong>{label}</strong><small>{hint}</small></button>)}</div>{record.reviewAt&&<p role="status">Next review: {new Date(record.reviewAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</p>}</div></div>}
          {tab==='resources'&&<div className="studio-notebook-body"><p className="studio-eyebrow">SUBJECT COMPANION</p><h2>The ideas to keep close</h2><p>{guide.intro}</p><p className="studio-footnote">Original study notes for the subject, not a transcript or a claim that this lesson covers every concept below.</p><div className="studio-concepts">{guide.concepts.map(([title,body],i)=><article key={title}><span>{String(i+1).padStart(2,'0')}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}</div><div className="studio-answer-guide"><strong>Work through an example</strong><p>{guide.example}</p></div><div className="studio-resource-links">{course.notesUrl&&<a href={course.notesUrl} target="_blank" rel="noreferrer">Publisher’s Control Systems PDFs ↗<small>{course.notesSource}</small></a>}<Link to="/notes">Published semester PDFs & past questions <ArrowRight size={14}/></Link><a href={channelUrl} target="_blank" rel="noreferrer">Newbert channel & new uploads ↗</a><button onClick={exportNotebook}><Download size={15}/>Download notes & companion</button></div></div>}
        </section>
        {next&&<Link className="studio-next-lesson" to={lessonHref(course.id,next.videoId)}><span><small>NEXT IN THIS SUBJECT</small><strong>{next.title}</strong></span><ArrowRight size={20}/></Link>}
      </div>
    </div>
  </div></main>;
}

function NotebookNote({ note, onSeek, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.text);
  return <article className={note.kind==='question'&&!note.resolved?'studio-question-note':''}>
    <button className="studio-timestamp" onClick={onSeek}>{timeLabel(note.seconds)} ↗</button>
    <div><span>{note.kind==='question'?(note.resolved?'Resolved question':'Revisit this'):'My note'}</span>
      {editing?<div className="studio-note-editor"><textarea aria-label="Edit saved note" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={1500} rows={3}/><div><button disabled={!draft.trim()} className="studio-resolve" onClick={()=>{onUpdate({text:draft.trim()});setEditing(false);}}>Save changes</button><button className="studio-resolve" onClick={()=>setEditing(false)}>Cancel</button></div></div>:<><p>{note.text}</p><button className="studio-resolve" onClick={()=>{setDraft(note.text);setEditing(true);}}>Edit note</button></>}
      {note.kind==='question'&&<button className="studio-resolve" onClick={()=>onUpdate({resolved:!note.resolved})}>{note.resolved?'Reopen question':'I understand this now'}</button>}
    </div>
  </article>;
}
