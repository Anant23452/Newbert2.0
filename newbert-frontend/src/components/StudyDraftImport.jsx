import { useState } from 'react';
import API from '../Services/api';

export default function StudyDraftImport({ form, context, busy, setBusy, onApply }) {
  const [mode,setMode]=useState('text'), [text,setText]=useState(''), [isPYQ,setPYQ]=useState(false);
  const [exam,setExam]=useState(''), [year,setYear]=useState(''), [sourceUrl,setSourceUrl]=useState('');
  const [draft,setDraft]=useState(null), [error,setError]=useState(''), [selected,setSelected]=useState([]), [useSummary,setUseSummary]=useState(true);
  const generate=async()=>{
    setBusy(true);setError('');setDraft(null);
    try {
      const {data}=await API.post('/admin/study/generate-draft',{mode,text,url:form.url,context,isPYQ:mode==='text'&&isPYQ,exam,year,sourceUrl},{timeout:100000});
      setDraft(data.draft);setSelected([...data.draft.quiz.map((_,i)=>`q${i}`),...data.draft.practice.map((_,i)=>`p${i}`)]);
    } catch(e){setError(e.response?.data?.message || 'Draft generation failed. Your lesson has not changed.');}
    finally {setBusy(false);}
  };
  const apply=()=>{
    const quiz=draft.quiz.filter((_,i)=>selected.includes(`q${i}`)), practice=draft.practice.filter((_,i)=>selected.includes(`p${i}`));
    if(form.quiz.length+quiz.length>10 || form.practice.length+practice.length>20){setError('Select fewer questions. A lesson supports 10 MCQs and 20 written questions.');return;}
    onApply({quiz:[...form.quiz,...quiz],practice:[...form.practice,...practice],...(mode==='video'&&useSummary&&draft.summary?{summary:draft.summary}:{})});setDraft(null);setError('');
  };
  return <details className="study-panel"><summary>Import questions or generate from video with Gemini</summary><p>Creates a draft for your review. Nothing is published automatically.</p><label>Input<select disabled={busy} value={mode} onChange={e=>{setMode(e.target.value);setDraft(null);setError('');}}><option value="text">Paste multiple questions</option><option value="video">Generate from this YouTube video</option></select></label>
    {mode==='text'?<><label>Questions, options and any existing answers<textarea disabled={busy} rows={8} maxLength={20000} value={text} onChange={e=>{setText(e.target.value);setDraft(null);}}/></label><label><input disabled={busy} type="checkbox" checked={isPYQ} onChange={e=>{setPYQ(e.target.checked);setDraft(null);}}/>These are actual previous-year questions</label>{isPYQ&&<><p>PYQ options are retained as written practice so the original paper source stays attached.</p><label>Exam<input disabled={busy} maxLength={150} value={exam} onChange={e=>{setExam(e.target.value);setDraft(null);}}/></label><label>Year<input disabled={busy} type="number" min="2000" max={new Date().getFullYear()} value={year} onChange={e=>{setYear(e.target.value);setDraft(null);}}/></label><label>Original paper HTTPS link<input disabled={busy} type="url" value={sourceUrl} onChange={e=>{setSourceUrl(e.target.value);setDraft(null);}}/></label></>}</>:<p>Uses the lesson’s YouTube link. Video access and Gemini limits may affect generation. The summary is AI-generated, not the original description.</p>}
    <button type="button" disabled={busy || (mode==='text'?!text.trim():!form.url) || (mode==='text'&&isPYQ&&(!exam.trim()||!year||!sourceUrl))} onClick={generate}>{busy?'Generating draft…':'Generate draft'}</button>
    {error&&<p role="alert">{error}</p>}{draft&&<section><h3>Review generated draft</h3><p>Check wording and every answer. You can edit added questions in the lesson editor before saving.</p>{draft.warnings.map((w,i)=><p key={i} role="status">{w}</p>)}{mode==='video'&&draft.summary&&<><label><input type="checkbox" checked={useSummary} onChange={e=>setUseSummary(e.target.checked)}/>Replace lesson summary with this draft</label><p style={{whiteSpace:'pre-wrap'}}>{draft.summary}</p></>}{[...draft.quiz.map((q,i)=>({...q,key:`q${i}`,answer:q.options[q.correct],detail:q.explanation})),...draft.practice.map((q,i)=>({...q,key:`p${i}`,answer:q.solution}))].map(q=><article className="study-panel" key={q.key}><label><input type="checkbox" checked={selected.includes(q.key)} onChange={e=>setSelected(v=>e.target.checked?[...v,q.key]:v.filter(k=>k!==q.key))}/><span style={{whiteSpace:'pre-wrap'}}>{q.question}</span></label>{q.options&&<ol type="A">{q.options.map((o,i)=><li key={i}>{o}</li>)}</ol>}<p style={{whiteSpace:'pre-wrap'}}><strong>Draft answer: </strong>{q.answer}</p>{q.detail&&<p>{q.detail}</p>}</article>)}<button disabled={busy || (!selected.length&&!(mode==='video'&&useSummary&&draft.summary))} type="button" onClick={apply}>Add selected drafts to lesson</button><button type="button" onClick={()=>setDraft(null)}>Discard draft</button></section>}
  </details>;
}
