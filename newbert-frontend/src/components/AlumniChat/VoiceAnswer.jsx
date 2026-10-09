import { useEffect, useRef, useState } from 'react';

export default function VoiceAnswer({ value, onChange, disabled, maxLength = 6000 }) {
  const recognition = useRef(null);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const [language, setLanguage] = useState('en-IN');
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  useEffect(() => () => {
    if (recognition.current) {
      recognition.current.onresult = null;
      recognition.current.onend = null;
      recognition.current.onerror = null;
      recognition.current.abort();
    }
  }, []);
  useEffect(() => { if (disabled) recognition.current?.abort(); }, [disabled]);

  function start() {
    if (!Speech || disabled || recognition.current) return;
    const instance = new Speech();
    recognition.current = instance;
    instance.lang = language;
    instance.continuous = true;
    instance.interimResults = false;
    instance.onresult = event => {
      let spoken = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) spoken += `${event.results[i][0].transcript} `;
      }
      if (!spoken.trim()) return;
      const next = `${latest.current.value || ''} ${spoken.trim()}`.trim();
      latest.current = { ...latest.current, value: next.slice(0, maxLength) };
      latest.current.onChange(latest.current.value);
      if (next.length >= maxLength) { instance.stop(); setMessage('Answer limit reached. Review your transcript.'); }
    };
    instance.onerror = event => {
      setMessage(event.error === 'not-allowed' ? 'Microphone access was declined. You can type your answer instead.' : 'Voice recognition stopped. Your transcript is still editable; type or try again.');
      instance.abort();
    };
    instance.onend = () => { recognition.current = null; setListening(false); };
    setMessage('');
    try { instance.start(); setListening(true); }
    catch { recognition.current = null; setMessage('Voice is unavailable here. Type your answer instead.'); }
  }
  return <div className="ac-voice">
    <p className="text-xs text-slate-400">Speak or type, then review before submitting. Your browser may send audio to its speech service. Newbert does not store the recording.</p>
    {Speech ? <div className="ac-actions">
      <label>Voice language <select value={language} disabled={listening || disabled} onChange={e => setLanguage(e.target.value)}><option value="en-IN">English (India)</option><option value="hi-IN">Hindi</option></select></label>
      <button type="button" className="ac-secondary" disabled={disabled} onClick={() => listening ? recognition.current?.stop() : start()}>{listening ? 'Stop listening' : 'Start voice answer'}</button>
    </div> : <p className="text-xs text-slate-400">Voice recognition is unavailable in this browser. Text answers work normally.</p>}
    <p role="status" className="text-xs text-orange-300">{message || (listening ? 'Listening… your words appear in the editable answer.' : '')}</p>
  </div>;
}
