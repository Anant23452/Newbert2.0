import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Send, Sparkles } from 'lucide-react';
import API from '../Services/api';
import { downloadText, readStudyLocal, writeStudyLocal } from '../utils/studyTools';
export default function UnitTutor({branch,subject,unit,scope,authenticated,reflection}) {
  const key=`newbert-tutor:${scope}:${branch}:${subject.id}:${unit.number}`;
  const [question,setQuestion]=useState('');
  const [language,setLanguage]=useState('English');
  const [answer,setAnswer]=useState(()=>readStudyLocal(key,''));
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const request=useRef(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  async function ask(action) {
    if(request.current)return;
    const controller=new AbortController();request.current=controller;
    setBusy(action);setError('');
    try {
      const {data}=await API.post('/profiles/study-assistant',{branch,subjectId:subject.id,unit:unit.number,action,question,answer:action==='feedback'?reflection:'',language},{timeout:40000,signal:controller.signal});
      if(controller.signal.aborted)return;
      setAnswer(data.answer);
      if(!writeStudyLocal(key,data.answer))setError('The answer is open here, but this browser could not save it. Download it before leaving.');
    } catch(e) {if(!controller.signal.aborted)setError(e.response?.data?.message || 'The tutor could not connect. Please try again. Your notes are still saved.');}
    finally {if(!controller.signal.aborted){setBusy('');request.current=null;}}
  }
  return <div className="studio-notebook-body academic-tutor"><p className="studio-eyebrow"><Sparkles size={14}/> NEWBERT AI / UNIT {unit.number}</p><h2>A tutor for this part of your course.</h2><p>Ask about {unit.title.toLowerCase()}, practise a question, or get feedback on your recall answer.</p>{!authenticated?<div className="studio-notice"><Link to="/profile">Sign in to use your study tutor <Send size={14}/></Link></div>:<><label>Response language<select aria-label="Tutor language" value={language} onChange={e=>setLanguage(e.target.value)}><option>English</option><option>Hinglish</option></select></label><textarea aria-label="Question for your unit tutor" maxLength={1500} rows={3} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="What part is unclear? Give the tutor a specific question…"/><div className="academic-tutor-actions">{[['explain','Explain with an example'],['quiz','Give me practice'],['feedback','Review my recall'],['plan','Plan 25 minutes']].map(([id,label])=><button className="studio-secondary" disabled={Boolean(busy)||id==='feedback'&&!reflection?.trim()} key={id} onClick={()=>ask(id)}>{busy===id?'Thinking…':label}</button>)}</div><small>Feedback uses the answer you wrote in Recall. The tutor receives your selected unit and the text you submit.</small></>}{busy&&<p role="status" className="academic-ai-thinking">Working through your unit…</p>}{error&&<p className="studio-notice" role="alert">{error}</p>}{answer&&<article className="academic-ai-answer"><p className="studio-eyebrow">AI STUDY HELP · CHECK AGAINST YOUR COURSE MATERIAL</p><div>{answer}</div><button className="studio-secondary" onClick={()=>downloadText(`${subject.code}-unit-${unit.number}-tutor.txt`,`${subject.title} · Unit ${unit.number}\nAI-generated study help, not an official answer key.\n\n${answer}`)}><Download size={15}/>Download explanation</button></article>}<p className="studio-footnote">The tutor uses your unit’s syllabus heading, not a video transcript. It can make mistakes. Saved answers stay on this device; your account notebook syncs separately.</p></div>;
}
