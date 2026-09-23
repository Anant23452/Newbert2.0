import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import useAuth from '../hook/useAuth';
import QuestionRenderer from '../components/AlumniChat/QuestionRenderer';
import { AnswerValue } from '../components/AlumniChat/AnswerFields';
import '../alumni-chat.css';

const questions = [
  { id: 'name', section: 'About you', text: 'What name would you like your Newbert profile to use?', type: 'text', required: false },
  { id: 'branch', section: 'Studies', text: 'What branch are you studying?', type: 'text', required: false },
  { id: 'targetRole', section: 'Direction', text: 'What role or career direction interests you right now?', type: 'text', required: false },
  { id: 'targetCompany', section: 'Direction', text: 'Is there a company you want to prepare for?', type: 'text', required: false },
  { id: 'skills', section: 'Your work', text: 'Which skills have you actually practised so far?', type: 'skills', required: false, fields: [{ id: 'name', label: 'Skill', type: 'text', required: true }] },
  { id: 'projects', section: 'Your work', text: 'How many projects have you completed?', type: 'number', required: false, min: 0, max: 1000 },
  { id: 'cgpa', section: 'Studies', text: 'Would you like to include your CGPA?', type: 'number', required: false, min: 0, max: 10 },
  { id: 'bio', section: 'About you', text: 'Tell other students a little about yourself.', type: 'textarea', required: false, maxLength: 600 },
  { id: 'github', section: 'Profiles', text: 'Do you have a GitHub profile?', type: 'url', required: false },
  { id: 'leetcode', section: 'Profiles', text: 'Do you have a LeetCode profile?', type: 'url', required: false },
  { id: 'linkedin', section: 'Profiles', text: 'Would you like to add LinkedIn?', type: 'url', required: false },
  { id: 'avatar', section: 'About you', text: 'Would you like to add a profile image URL?', type: 'url', required: false },
  { id: 'cover', section: 'About you', text: 'Would you like to add a cover image URL?', type: 'url', required: false },
];

function storedSkips(userId) {
  try { return JSON.parse(localStorage.getItem(`newbert:junior-chat:skips:${userId}`) || '[]'); }
  catch { return []; }
}

function answerMap(profile) {
  const map = {};
  for (const question of questions) {
    const value = profile?.[question.id];
    if (value !== null && value !== undefined && value !== '' && (!Array.isArray(value) || value.length)) map[question.id] = value;
  }
  return map;
}

export default function JuniorProfileChat() {
  const { profile, saveProfile, loading } = useAuth();
  const navigate = useNavigate();
  const userId = profile?.userId || 'loading';
  const [skipped, setSkipped] = useState(() => storedSkips(userId));
  const [index, setIndex] = useState(null);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [review, setReview] = useState(false);

  useEffect(() => { if (profile?.userId) setSkipped(storedSkips(profile.userId)); }, [profile?.userId]);

  if (loading) return <main className="alumni-chat-page"><p className="ac-loading">Opening your profile conversation…</p></main>;
  if (!profile) return <main className="alumni-chat-page"><div className="ac-shell"><h1>Sign in to save your profile.</h1><Link to="/">Go to Newbert</Link></div></main>;

  const answers = answerMap(profile);
  const completed = questions.filter(q => Object.hasOwn(answers, q.id) || skipped.includes(q.id)).length;
  const firstUnanswered = questions.findIndex(q => !Object.hasOwn(answers, q.id) && !skipped.includes(q.id));
  const currentIndex = index ?? (firstUnanswered < 0 ? questions.length : firstUnanswered);
  const question = questions[currentIndex];
  const sections = [...new Set(questions.map(q => q.section))].map(name => ({ name, total: questions.filter(q => q.section === name).length, completed: questions.filter(q => q.section === name && (Object.hasOwn(answers, q.id) || skipped.includes(q.id))).length }));

  function next(from) { const later = questions.findIndex((q, i) => i > from && !Object.hasOwn(answers, q.id) && !skipped.includes(q.id)); setIndex(later < 0 ? questions.length : later); setReview(later < 0); }
  function skip(id) {
    const updated = [...new Set([...skipped, id])];
    setSkipped(updated);
    localStorage.setItem(`newbert:junior-chat:skips:${userId}`, JSON.stringify(updated));
    next(currentIndex);
  }
  async function save(id, value) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await saveProfile({ [id]: value });
      const updated = skipped.filter(item => item !== id);
      setSkipped(updated);
      localStorage.setItem(`newbert:junior-chat:skips:${userId}`, JSON.stringify(updated));
      setVersion(v => v + 1);
      next(currentIndex);
    } catch (err) { setError(err.response?.data?.message || 'That answer could not be saved. Please try again.'); }
    finally { setBusy(false); }
  }

  const session = { answers, rawAnswers: {}, pendingExtraction: null, version, skippedQuestions: skipped };
  return <main className="alumni-chat-page"><div className="ac-shell">
    <Link className="ac-back" to="/">← Today</Link>
    <header className="ac-header"><div><span className="ac-wordmark">N</span><div><strong>Your Newbert profile</strong><small>More useful guidance, one answer at a time.</small></div></div></header>
    {error && <p className="ac-alert" role="alert">{error}</p>}
    {index === null && !review ? <section className="ac-welcome"><p className="ac-kicker">OPTIONAL PROFILE CONVERSATION</p><h1>You are already in.<br/><em>Make Newbert more yours.</em></h1><p>Your college and class year were enough to start. Share your branch, goals and actual work so comparisons and suggestions can become more relevant. Skip anything you do not want to answer.</p><p><strong>{completed} of {questions.length}</strong> details completed or skipped.</p><button className="ac-primary" onClick={() => { if (firstUnanswered < 0) setReview(true); else setIndex(firstUnanswered); }}>Continue my profile <ArrowRight size={17}/></button></section>
      : <>
        <section className="ac-progress" aria-label="Profile progress"><div><strong>{Math.round(completed / questions.length * 100)}% complete</strong><span>{completed} of {questions.length} questions</span></div><progress max="100" value={Math.round(completed / questions.length * 100)}/><div className="ac-sections">{sections.map(section => <button key={section.name} onClick={() => { setIndex(questions.findIndex(q => q.section === section.name)); setReview(false); }}>{section.completed === section.total ? '✓ ' : ''}{section.name}</button>)}</div><button className="ac-review-link" onClick={() => setReview(true)}>Review my profile →</button></section>
        {review || !question ? <section className="ac-review"><p className="ac-kicker">YOUR STUDENT PROFILE</p><h1>Here is what Newbert knows.</h1><p>These answers can be changed any time. Unanswered details stay optional.</p>{questions.map((item, i) => <article key={item.id}><div className="ac-review-heading"><h3>{item.text}</h3><button className="ac-secondary" onClick={() => { setIndex(i); setReview(false); }}>Edit</button></div>{Object.hasOwn(answers, item.id) ? <AnswerValue value={answers[item.id]}/> : <p>{skipped.includes(item.id) ? 'Skipped' : 'Not added yet'}</p>}</article>)}<div className="ac-actions"><button className="ac-secondary" onClick={() => navigate('/profile')}>View my profile</button><button className="ac-primary" onClick={() => navigate('/')}>Go to Today →</button></div></section>
          : <QuestionRenderer key={`${question.id}:${version}`} question={question} session={session} scope={userId} privacyFields={[]} audience="student" busy={busy} onAnswer={save} onSkip={skip} onBack={() => { setIndex(Math.max(0, currentIndex - 1)); setReview(false); }} onPracticeCheck={async () => ({ data: { metrics: null, message: 'Save this link to your profile first.' } })}/>}
      </>}
  </div></main>;
}
