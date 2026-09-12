import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, Download, Expand, Play, Plus, RotateCcw, Sparkles } from 'lucide-react';
import useLectureNotebook from '../hook/useLectureNotebook';
import { academicSubjectHref, academicUnitKey } from '../utils/academicYear';
import { lessonsForUnit } from '../data/academicStudy';
import { channelUrl, lectureKey, lessonHref } from '../data/studyCatalog';
import { unitCompanions } from '../data/unitCompanions';
import { downloadText, timeLabel } from '../utils/studyTools';
import LecturePlayer from './LecturePlayer';
import UnitTutor from './UnitTutor';
import StudyConceptLab from './StudyConceptLab';

export default function UnitWorkspace({branch,subject,unit,source,scope,authenticated}) {
  const notebook=useLectureNotebook(academicUnitKey(branch.id,subject.id,unit.number),scope,authenticated);
  const {record,update}=notebook;
  const [params,setParams]=useSearchParams();
  const [tab,setTab]=useState('guide');
  const [text,setText]=useState('');
  const [kind,setKind]=useState('note');
  const [error,setError]=useState('');
  const [reveal,setReveal]=useState(false);
  const [focus,setFocus]=useState(false);
  const viewed=useRef(false);
  useEffect(()=>{if(!notebook.loading&&!viewed.current){viewed.current=true;update({});}},[notebook.loading,update]);
  const lessons=lessonsForUnit(subject,unit.number);
  const lesson=lessons.find(l=>l.videoId===params.get('lesson'))||lessons[0];
  const companion=unitCompanions[subject.code]?.[unit.number-1];
  const notes=record.notes||[];
  const addNote=()=>{
    if(!text.trim()){setError('Write an idea or question first.');return;}
    if(notes.length>=80){setError('This unit has 80 notes. Edit a note or export your notebook.');return;}
    update({notes:[...notes,{id:crypto.randomUUID(),seconds:0,text:text.trim(),kind,resolved:false}]});setText('');setError('');
  };
  const exportNotes=()=>downloadText(`${subject.code}-unit-${unit.number}.md`,`# ${subject.title}\n## Unit ${unit.number}: ${unit.title}\nOfficial syllabus: ${source.url}\n\n## My notes\n${notes.map(n=>`- ${n.kind==='question'?'Question: ':''}${n.text}${n.resolved?' (resolved)':''}`).join('\n')}\n\n## My recall\n${record.reflection||'Not written yet.'}\n\n${companion?`## Original Newbert companion (not a transcript)\n${companion.ideas.join('\n\n')}\n\nExample: ${companion.example}`:''}`);
  return <main className={`studio-page academic-page academic-classroom ${focus?'academic-focus':''}`}><div className="studio-shell">
    <div className="academic-breadcrumb"><Link to={academicSubjectHref(branch.id,subject.id)}><ArrowLeft size={15}/>{subject.title} · All units</Link><button className="studio-secondary" onClick={()=>setFocus(v=>!v)}><Expand size={14}/>{focus?'Standard view':'Focus view'}</button></div>
    <header className="academic-class-header"><p className="studio-eyebrow">{branch.code} / YEAR {subject.year} / {subject.code}</p><h1><span>Unit {unit.number}.</span> {unit.title}</h1><p>{subject.title}</p></header>
    <nav className="academic-unit-nav" aria-label="Units">{subject.units.map(u=><Link aria-current={u.number===unit.number?'page':undefined} to={academicSubjectHref(branch.id,subject.id,u.number)} key={u.number}><span>0{u.number}</span><strong>{u.title}</strong></Link>)}</nav>
    <div className="academic-workspace"><div className="academic-video-column">
      {lesson?<><div className="academic-lesson-picker"><label htmlFor="unit-lecture">Published lecture</label><select id="unit-lecture" value={lesson.videoId} onChange={e=>setParams({unit:String(unit.number),lesson:e.target.value})}>{lessons.map(l=><option value={l.videoId} key={l.videoId}>{l.title} · ~{l.minutes} min</option>)}</select></div><UnitVideo key={`${scope}:${lesson.videoId}`} subject={subject} lesson={lesson} scope={scope} authenticated={authenticated}/></>:<section className="academic-no-video"><div className="academic-empty-screen" aria-hidden="true"><Play size={34}/><span>UNIT {unit.number}</span></div><p className="studio-eyebrow">YOUR WORKSPACE IS READY</p><h2>No Newbert video listed for this unit yet.</h2><p>Start with the syllabus and notes beside you. Use the tutor for an explanation or practice, and keep your questions here for revision.</p><div className="studio-hero-links"><a className="studio-primary" href={source.url} target="_blank" rel="noreferrer">Read the official syllabus ↗</a><a className="studio-secondary" href={channelUrl} target="_blank" rel="noreferrer">Visit Newbert’s channel ↗</a></div></section>}
      <StudyConceptLab code={subject.code}/>
      <div className="academic-session-end"><div><h3>{record.completed?'A unit you’ve worked through.':'Finish with something you can explain.'}</h3><p>Use recall before moving on. You decide when this unit is complete.</p></div><button disabled={notebook.loading} className={record.completed?'studio-secondary':'studio-primary'} onClick={()=>update({completed:!record.completed})}><Check size={15}/>{record.completed?'Completed · undo':'Mark unit complete'}</button></div>
      {unit.number<5&&<Link className="studio-next-lesson" to={academicSubjectHref(branch.id,subject.id,unit.number+1)}><span><small>NEXT UNIT</small><strong>{subject.units[unit.number].title}</strong></span><ArrowRight size={20}/></Link>}
    </div><aside className="academic-notes-column" aria-label="Unit learning tools">
      <section className="studio-notebook"><div className="studio-notebook-tabs" role="group" aria-label="Unit notebook tabs">{[['guide','Unit guide',BookOpen],['notes','My notes',Plus],['recall','Recall',RotateCcw],['tutor','AI tutor',Sparkles]].map(([id,label,icon])=>{const Icon=icon;return <button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}><Icon size={15}/>{label}</button>;})}</div>
      <div className="academic-notebook-status"><span role="status">{notebook.status}</span><button aria-label="Download unit notebook" onClick={exportNotes}><Download size={16}/></button></div>
      {notebook.error&&<div className="studio-notice" role="alert">{notebook.error}<button onClick={notebook.retry}>Retry</button></div>}
      {tab==='guide'&&<div className="studio-notebook-body"><p className="studio-eyebrow">UNIT {unit.number} / {subject.code}</p><h2>{unit.title}</h2>{companion?<><p className="studio-footnote">Original Newbert study companion · not a lecture transcript.</p><div className="academic-guide-ideas">{companion.ideas.map((idea,i)=><article key={idea}><span>0{i+1}</span><p>{idea}</p></article>)}</div><div className="studio-answer-guide"><strong>Work through an example</strong><p>{companion.example}</p></div></>:<><p>This unit focuses on <strong>{unit.title.toLowerCase()}</strong>. Open the official syllabus for its full topic list and reference books, then build your own explanation here.</p><div className="academic-guide-prompt"><BookOpen size={25}/><h3>Turn the outline into your understanding.</h3><p>Use the AI tutor for a worked explanation of this unit. Save what you understand in My notes and use Recall to find the gaps.</p><button className="studio-primary" onClick={()=>setTab('tutor')}><Sparkles size={14}/>Explain this unit</button></div></>}
        <div className="studio-resource-links"><a href={source.url} target="_blank" rel="noreferrer">Official unit details · AKTU {source.edition} ↗</a><Link to={`/notes/${branch.id}`}>Branch notes, PDFs & past papers <ArrowRight size={14}/></Link><button onClick={()=>setTab('notes')}><Plus size={14}/>Add my own explanation</button></div></div>}
      {tab==='notes'&&<div className="studio-notebook-body"><h2>Make this unit yours.</h2><p>Keep definitions, worked steps and questions together. Video timestamp notes live beneath the lecture.</p><fieldset className="studio-note-composer" disabled={notebook.loading}><legend className="sr-only">Unit note</legend><div className="studio-note-kind">{[['note','An idea'],['question','A question']].map(([id,label])=><button key={id} aria-pressed={kind===id} onClick={()=>setKind(id)}>{label}</button>)}</div><textarea aria-label="Your unit note" rows={4} maxLength={1500} value={text} onChange={e=>setText(e.target.value)} placeholder="A definition in your words, the steps of a problem, or what you still want to ask…"/><div><small>{text.length}/1500 · {notes.length}/80 notes</small><button className="studio-primary" onClick={addNote}><Plus size={15}/>Save note</button></div>{error&&<p role="alert">{error}</p>}</fieldset><div className="academic-personal-notes">{notes.map(note=><UnitNote key={note.id} note={note} disabled={notebook.loading} change={fields=>update({notes:notes.map(n=>n.id===note.id?{...n,...fields}:n)})}/>)}{!notes.length&&<p className="studio-inline-empty">Your notes start with an idea you choose to keep.</p>}</div></div>}
      {tab==='recall'&&<div className="studio-notebook-body"><p className="studio-eyebrow">TRY IT WITHOUT LOOKING</p><h2>What stayed with you?</h2><p className="studio-recall-question">{companion?.question||`Explain ${unit.title.toLowerCase()} to a classmate. Include one example, the steps or assumptions that matter, and one point you are still unsure about.`}</p><textarea disabled={notebook.loading} aria-label="Your unit recall answer" value={record.reflection||''} maxLength={6000} rows={7} onChange={e=>update({reflection:e.target.value})} placeholder="Write your reasoning first…"/>{companion&&<><button className="studio-secondary" onClick={()=>setReveal(v=>!v)}>{reveal?'Hide answer guide':'Compare with the answer guide'}</button>{reveal&&<div className="studio-answer-guide"><p>{companion.answer}</p></div>}</>}<button className="studio-secondary" disabled={!record.reflection?.trim()} onClick={()=>setTab('tutor')}>Ask the tutor about my answer <Sparkles size={14}/></button><div className="studio-recall-rating"><h3>Choose your next review</h3><p>Your own rating, not an exam grade.</p><div>{[['again','Another pass','Today'],['good','Got the idea','In 3 days'],['solid','Can explain it','In 7 days']].map(([id,label,hint])=><button key={id} aria-pressed={record.confidence===id} disabled={notebook.loading||!record.reflection?.trim()} onClick={()=>update({confidence:id})}><strong>{label}</strong><small>{hint}</small></button>)}</div>{record.reviewAt&&<p role="status">Next recall: {new Date(record.reviewAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</p>}</div></div>}
      <div hidden={tab!=='tutor'}><UnitTutor branch={branch.id} subject={subject} unit={unit} scope={scope} authenticated={authenticated} reflection={record.reflection}/></div>
      </section>
    </aside></div>
  </div></main>;
}

function UnitNote({note,change,disabled}) {
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(note.text);
  return <article className={note.kind==='question'&&!note.resolved?'academic-question':''}><small>{note.kind==='question'?(note.resolved?'Resolved question':'Question to revisit'):'My explanation'}</small>{editing?<><textarea aria-label="Edit unit note" maxLength={1500} value={draft} onChange={e=>setDraft(e.target.value)}/><button disabled={disabled||!draft.trim()} onClick={()=>{change({text:draft.trim()});setEditing(false);}}>Save changes</button><button onClick={()=>setEditing(false)}>Cancel</button></>:<><p>{note.text}</p><button disabled={disabled} onClick={()=>{setDraft(note.text);setEditing(true);}}>Edit</button></>}{note.kind==='question'&&<button disabled={disabled} onClick={()=>change({resolved:!note.resolved})}>{note.resolved?'Reopen':'I understand this now'}</button>}</article>;
}

function UnitVideo({subject,lesson,scope,authenticated}) {
  const notebook=useLectureNotebook(lectureKey(subject.lectureCollection,lesson.videoId),scope,authenticated);
  const {record,update}=notebook;
  const controller=useRef(null);
  const position=useRef(record.positionSeconds||0);
  const [text,setText]=useState('');
  const [error,setError]=useState('');
  const notes=record.notes||[];
  const save=()=>{
    if(!text.trim()||notes.length>=80){setError(notes.length>=80?'This lecture already has 80 notes. Open the full lecture notebook to edit them.':'Write a timestamp note first.');return;}
    update({notes:[...notes,{id:crypto.randomUUID(),seconds:Math.floor(controller.current?.time()??position.current),text:text.trim(),kind:'note',resolved:false}]});setText('');setError('');
  };
  return <section className="academic-unit-video">{notebook.loading?<div className="studio-player-placeholder" role="status">Opening your saved lecture…</div>:<LecturePlayer videoId={lesson.videoId} title={`${subject.title}: ${lesson.title}`} controller={controller} initialSeconds={record.positionSeconds} onTime={seconds=>{position.current=seconds;}} onProgress={update}/>}<div className="studio-lesson-actions"><p role="status">{notebook.status}</p><button className="studio-secondary" disabled={notebook.loading} onClick={()=>update({completed:!record.completed})}><Check size={15}/>{record.completed?'Lesson complete · undo':'Mark lesson complete'}</button></div>{notebook.error&&<div className="studio-notice" role="alert">{notebook.error}<button onClick={notebook.retry}>Retry</button></div>}<details className="academic-timestamps"><summary>Timestamp notebook · {notes.length} {notes.length===1?'note':'notes'}</summary><p>These are the same notes as in your original lecture classroom.</p><textarea aria-label="New timestamp note" value={text} onChange={e=>setText(e.target.value)} maxLength={1500} rows={2} placeholder="Catch an idea at this moment…"/><button className="studio-primary" disabled={notebook.loading} onClick={save}>Save at this moment</button>{error&&<p role="alert">{error}</p>}{notes.map(n=><article key={n.id}><button onClick={()=>controller.current?controller.current.seek(n.seconds):window.open(`${lesson.url}&t=${n.seconds}s`,'_blank','noopener,noreferrer')}>{timeLabel(n.seconds)} ↗</button><p>{n.kind==='question'?'Question: ':''}{n.text}</p></article>)}<Link to={lessonHref(subject.lectureCollection,lesson.videoId)}>Open full lecture notebook & recall <ArrowRight size={15}/></Link></details></section>;
}
