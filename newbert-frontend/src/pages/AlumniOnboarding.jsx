import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, MessageSquare, ShieldCheck } from 'lucide-react';
import useAuth from '../hook/useAuth';
import API from '../Services/api';
import { normalizeStoryPayload } from '../utils/alumniPayload';
import QuestionRenderer from '../components/AlumniChat/QuestionRenderer';
import AlumniReview, { PrivateEvidence } from '../components/AlumniChat/AlumniReview';
import { AnswerValue } from '../components/AlumniChat/AnswerFields';
import '../alumni-chat.css';

const GUEST_KEY = 'newbert:alumni:guest-token:v1';

// Older server responses may omit empty Mixed fields. Keep the page usable and
// never pass an undefined answers object to a question or review component.

export default function AlumniOnboarding() {
  const { user, profile, isAuthenticated } = useAuth();
  const guest = !isAuthenticated;
  const scope = profile?.userId || user?.id || user?.email || 'guest';
  return <main className="alumni-chat-page"><div className="ac-shell">
    <Link className="ac-back" to="/alumni-wall">← Alumni Wall</Link>
    <Conversation key={guest ? 'guest' : scope} guest={guest} scope={scope} name={profile?.name || user?.name || 'there'}/>
  </div></main>;
}

function Conversation({ guest, scope, name }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [view, setView] = useState('welcome');
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);
  const [restart, setRestart] = useState(false);
  const [hideConfirm, setHideConfirm] = useState(false);
  const alive = useRef(true);
  const session = data?.session;
  const question = editing || session?.currentQuestion;

  const request = useCallback(async (method, path, body, options = {}) => {
    if (guest && path === 'session' && !localStorage.getItem(GUEST_KEY)) return { data: { session: null } };
    const token = guest ? localStorage.getItem(GUEST_KEY) : null;
    const config = { ...options, headers: { ...options.headers, ...(token ? { 'X-Alumni-Guest-Token': token } : {}) } };
    const url = `/${guest ? 'alumni-guest' : 'alumni-chat'}/${path}`;
    const response = method === 'get' ? await API.get(url, config) : await API.post(url, body, config);
    if (guest && response.data?.guestToken) localStorage.setItem(GUEST_KEY, response.data.guestToken);
    return response;
  }, [guest]);

  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    request('get', 'session', undefined, { signal: controller.signal })
      .then(({ data: result }) => { if (alive.current) setData(normalizeStoryPayload(result)); })
      .catch(err => { if (err.code !== 'ERR_CANCELED' && alive.current) setError(err.response?.data?.message || 'Your saved story could not be loaded.'); })
      .finally(() => { if (alive.current) setLoading(false); });
    return () => { alive.current = false; controller.abort(); };
  }, [request]);

  async function loadReview() {
    setBusy(true); setError('');
    try {
      const { data: result } = await request('get', 'review');
      if (!alive.current) return;
      const next = normalizeStoryPayload(result);
      setData(next); setPreview(next.preview); setEditing(null); setView('review');
    } catch (err) { if (alive.current) setError(err.response?.data?.message || 'Review could not be loaded. Your submitted answers are saved.'); }
    finally { if (alive.current) setBusy(false); }
  }

  async function mutate(path, payload = {}, returnReview = false) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { data: result } = await request('post', path, { version: session?.version, ...payload });
      if (!alive.current) return;
      const next = normalizeStoryPayload(result);
      setData(next); setNotice(next.notice || ''); setEditing(null);
      if (returnReview || (!next.session?.currentQuestion && next.session?.status !== 'COMPLETED')) {
        const { data: reviewed } = await request('get', 'review');
        if (!alive.current) return;
        const reviewData = normalizeStoryPayload(reviewed);
        setData(reviewData); setPreview(reviewData.preview); setView('review');
      } else setView(next.session?.status === 'COMPLETED' ? 'published' : 'chat');
    } catch (err) { if (alive.current) setError(err.response?.data?.message || 'Your answer could not be saved. Keep this page open and try again.'); }
    finally { if (alive.current) setBusy(false); }
  }

  async function reload() {
    setError('');
    try {
      const { data: result } = await request('get', 'session');
      setData(normalizeStoryPayload(result)); setEditing(null); setView('welcome');
    } catch { setError('Could not reconnect. Please try again.'); }
  }

  async function hideStory() {
    try {
      await request('post', 'hide', { confirm: true });
      setHideConfirm(false);
      await loadReview();
      setNotice('Your story is hidden. Review and publish again whenever you are ready.');
    } catch (err) { setError(err.response?.data?.message || 'Could not hide your story.'); }
  }

  const completed = session?.completed || 0;
  const draftScope = guest ? localStorage.getItem(GUEST_KEY) || 'new-guest' : scope;
  return <>
    <header className="ac-header"><div><span className="ac-wordmark">N</span><div><strong>Newbert Alumni Assistant</strong><small>Your story. One conversation.</small></div></div><span className="ac-private"><ShieldCheck size={14}/>Private until you publish</span></header>
    {error && <div className="ac-alert" role="alert">{error}<button onClick={reload} disabled={busy}>Reload saved story</button></div>}
    {notice && <div className="ac-notice" role="status">{notice}</div>}
    {loading ? <p className="ac-loading">Finding your saved story…</p> : view === 'welcome' ? <section className="ac-welcome">
      <p className="ac-kicker">NEWBERT ALUMNI NETWORK</p>
      <h1>{completed ? `Welcome back, ${name.split(' ')[0]}.` : `Hi ${name.split(' ')[0]},`}<br/><em>{completed ? 'Your story is waiting.' : 'make the path clearer.'}</em></h1>
      <p>Your experience can help juniors see what actually worked. Add only the details you are comfortable sharing.</p>
      <div className="ac-welcome-points"><span><MessageSquare size={18}/>One question at a time</span><span><Check size={18}/>Save, leave and resume</span><span><ShieldCheck size={18}/>You choose what is shared</span></div>
      {completed > 0 && <p><strong>{session.progress}% complete</strong> · {completed} answers recorded</p>}
      <button className="ac-primary" disabled={busy} onClick={() => mutate('start')}>{busy ? 'Opening your conversation…' : session?.status === 'COMPLETED' ? 'Manage my published story' : completed ? 'Continue my story' : 'Start my story'}<ArrowRight size={17}/></button>
      <p className="ac-note">{guest ? 'No account is needed. Your private editing key stays in this browser; return on this device to continue or change your story.' : 'Submitted answers save to your account. You can edit them before and after publication.'}</p>
    </section> : view === 'published' ? <section className="ac-welcome">
      <p className="ac-kicker">YOUR JOURNEY IS LIVE</p><h1>A clearer path<br/><em>for the next student.</em></h1>
      <p>Your story is public with the visibility choices you made. It is labelled self-reported until independently verified.</p>
      <div className="ac-actions"><Link className="ac-primary" to={`/alumni-wall/${session.publishedAlumniId}`}>View my alumni profile</Link><button className="ac-secondary" onClick={loadReview}>Edit my story</button><button onClick={() => setHideConfirm(true)}>Hide from Alumni Wall</button></div>
      {hideConfirm && <div className="ac-alert"><p>Hide your published story? Your saved answers remain available.</p><button onClick={hideStory}>Confirm hide</button><button onClick={() => setHideConfirm(false)}>Cancel</button></div>}
    </section> : <>
      <section className="ac-progress" aria-label="Conversation progress"><div><strong>{session?.progress || 0}% complete</strong><span>{completed} of {session?.total || 0} relevant questions</span></div><progress max="100" value={session?.progress || 0}/>
        <div className="ac-sections">{session?.sections.map(section => <button key={section.name} aria-current={question?.section === section.name ? 'step' : undefined} disabled={busy} onClick={() => { setEditing(session.questions.find(q => q.section === section.name && !Object.hasOwn(session.answers, q.id)) || session.questions.find(q => q.section === section.name)); setView('chat'); }}>{section.completed === section.total ? '✓ ' : ''}{section.name}</button>)}</div>
        <button className="ac-review-link" onClick={loadReview} disabled={busy}>Review answers & privacy →</button>
      </section>
      {session?.prefill && Object.keys(session.prefill).length > 0 ? <section className="ac-prefill"><p className="ac-kicker">A HEAD START FROM YOUR PROFILE</p><h2>I found details you already shared.</h2><p>Check them before adding them to your alumni story.</p><AnswerValue value={session.prefill}/><div className="ac-actions"><button className="ac-secondary" disabled={busy} onClick={() => mutate('prefill', { use: false })}>Enter details myself</button><button className="ac-primary" disabled={busy} onClick={() => mutate('prefill', { use: true })}>Use these details</button></div></section>
        : view === 'review' ? <AlumniReview session={session} preview={preview} busy={busy} onEdit={q => { setEditing(q); setView('chat'); }} onPublish={() => mutate('publish', { confirm: true })} onContinue={() => { setEditing(null); setView(session.currentQuestion ? 'chat' : 'review'); }}/>
          : question ? <>
            {completed > 0 && <details className="ac-transcript"><summary>Your saved conversation · {completed} answers</summary>{session.questions.filter(q => Object.hasOwn(session.answers, q.id)).map(q => <article key={q.id}><p><strong>Newbert:</strong> {q.text}</p><div className="ac-user-answer"><AnswerValue value={session.answers[q.id]}/></div><button onClick={() => setEditing(q)}>Edit this answer</button></article>)}</details>}
            <QuestionRenderer key={`${question.id}:${session.version}`} question={question} session={session} scope={draftScope} privacyFields={data.privacyFields} audience={guest?'guest':'alumni'} busy={busy} returnToReview={Boolean(editing)} onAnswer={(id, value) => mutate('answer', { questionId: id, value }, Boolean(editing))} onExtract={(id, rawAnswer) => mutate('extract', { questionId: id, rawAnswer })} onConfirm={value => mutate('confirm-extraction', { value }, Boolean(editing))} onSkip={id => mutate('skip', { questionId: id }, Boolean(editing))} onBack={() => mutate('back')} onPracticeCheck={(id, value) => request('post', 'practice-check', { questionId: id, value })}/>
            {!guest && question.section === 'Verification' && <PrivateEvidence/>}
          </> : <div className="ac-alert">This conversation needs the latest Newbert API. Reload this page after the backend update.</div>}
      <footer className="ac-footer"><p>{guest ? 'Submitted answers stay available through the private key saved in this browser.' : 'Your account keeps submitted answers.'} Use review to jump to any remaining required answer.</p><button disabled={busy} onClick={() => setRestart(true)}>Restart draft</button>{restart && <div className="ac-alert"><p>Start a fresh draft? This clears the saved answers. Your published story remains unchanged.</p><button disabled={busy} onClick={() => { setRestart(false); mutate('restart', { confirm: true }); }}>Restart my draft</button><button onClick={() => setRestart(false)}>Keep my answers</button></div>}</footer>
    </>}
  </>;
}
