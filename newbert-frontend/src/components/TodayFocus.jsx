import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Clock3, Pause, Play, RefreshCw, RotateCcw, Target } from "lucide-react";
import { readSaved, restoreSession, saveLocal, taskKey } from "../utils/todayPersonalization";

export default function TodayFocus({ tasks, task, onSelect, minutes, userId, busy, onComplete, activePlans, syncing }) {
  return <section className="today-focus" aria-label="Your focus workspace">
    <div className="today-section-heading"><h2><Target size={19}/>Your next steps</h2><Link to="/roadmap">Full plan <ArrowRight size={15}/></Link></div>
    {task ? <>
      <p className="today-section-note">{task.estimatedMinutes > 0 && task.estimatedMinutes <= minutes ? `A ${task.estimatedMinutes}-minute step fits the ${minutes} minutes you have.` : `This step may take more than one session. Give it ${minutes} minutes to start.`} Next unfinished steps from your skill plans.</p>
      <div className="today-task-picker" aria-label="Choose a task">{tasks.map((item, index) => <button key={taskKey(item)} aria-pressed={taskKey(item) === taskKey(task)} onClick={() => onSelect(item)}><span className="today-task-number">{String(index + 1).padStart(2, "0")}</span><span><strong>{item.title}</strong><small>{item.skillName}{item.estimatedMinutes ? ` · ${item.estimatedMinutes} min` : ""}</small></span><ArrowRight size={16}/></button>)}</div>
      <FocusSession key={`${taskKey(task)}:${minutes}`} task={task} busy={busy} onComplete={onComplete} duration={minutes} userId={userId}/>
    </> : <div className="today-focus-empty"><Target size={34}/><h3>{activePlans ? "Review your progress and submit evidence" : "Choose your first preparation milestone"}</h3><p>{syncing ? "Your connected accounts are updating. Your career target is a good place to start." : activePlans ? "Your task queue is clear. Turn the work you have done into evidence for your skill plan." : "Start with one skill that matters to your target role. A small, concrete milestone is enough."}</p><Link className="today-primary" to="/roadmap">Open My Plan <ArrowRight size={16}/></Link></div>}
  </section>;
}

function FocusSession({ task, busy, onComplete, duration, userId }) {
  const storageKey = `newbert-today:${userId}:${taskKey(task)}:timer`;
  const noteKey = `newbert-today:${userId}:${taskKey(task)}:note`;
  const [initial] = useState(() => restoreSession(readSaved(storageKey, null), duration));
  const [minutes, setMinutes] = useState(initial.minutes);
  const [remaining, setRemaining] = useState(initial.remaining);
  const [running, setRunning] = useState(initial.running);
  const deadline = useRef(initial.deadline);
  const [note, setNote] = useState(() => { const saved = readSaved(noteKey, ""); return typeof saved === "string" ? saved : ""; });
  const [noteSaved, setNoteSaved] = useState(true);
  const [timerSaved, setTimerSaved] = useState(true);
  const persist = (next) => setTimerSaved(saveLocal(storageKey, next));
  useEffect(() => {
    if (!running) return undefined;
    // Wall-clock time stays accurate when the browser throttles background tabs.
    const tick = () => { const left = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)); setRemaining(left); if (!left) { setRunning(false); saveLocal(storageKey, { minutes, remaining: 0, running: false, deadline: 0 }); } };
    const interval = setInterval(tick, 250);
    tick();
    return () => clearInterval(interval);
  }, [running, storageKey, minutes]);
  const reset = (duration = minutes) => { setRunning(false); setMinutes(duration); setRemaining(duration * 60); persist({ minutes: duration, remaining: duration * 60, running: false, deadline: 0 }); };
  const toggle = () => {
    const left = running ? Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)) : remaining;
    deadline.current = running ? 0 : Date.now() + left * 1000;
    setRemaining(left); setRunning(!running);
    persist({ minutes, remaining: left, running: !running, deadline: deadline.current });
  };
  const elapsed = minutes * 60 - remaining;
  return <div className="today-session">
    <div className="today-session-copy"><p className="today-eyebrow">One step toward your target</p><h3>{task.title}</h3><p>{task.description}</p><div className="today-session-meta"><span><Target size={14}/>{task.skillName}</span><span><Clock3 size={14}/>{task.estimatedMinutes ? `${task.estimatedMinutes} min estimate` : "Your saved plan"}</span></div><button className="today-primary" disabled={Boolean(busy)} onClick={() => onComplete(task)} aria-label={`Mark ${task.title} complete`}>{busy === taskKey(task) ? <RefreshCw size={16} className="animate-spin"/> : <Check size={16}/>}Mark complete</button><small className="today-muted">Finished the work? Mark it complete when you’re ready.</small></div>
    <div className="today-timer"><div className="today-duration" role="group" aria-label="Focus duration">{[15, 25, 45].map((value) => <button key={value} aria-pressed={minutes === value} onClick={() => reset(value)}>{value}m</button>)}</div><div className={`today-clock-face ${running ? "is-running" : ""}`}><svg viewBox="0 0 160 160" aria-hidden="true"><circle className="today-ring-track" cx="80" cy="80" r="72"/><circle className="today-ring-value" cx="80" cy="80" r="72" pathLength="100" strokeDasharray={`${elapsed / (minutes * 60) * 100} 100`}/></svg><div className="today-clock" role="timer" aria-label="Focus time remaining">{String(Math.floor(remaining / 60)).padStart(2, "0")}<span>:</span>{String(remaining % 60).padStart(2, "0")}</div></div><progress className="sr-only" max={minutes * 60} value={elapsed} aria-label="Focus session progress"/><p role="status">{remaining === 0 ? "Session finished. Take a breath." : running ? "A little progress, right now." : elapsed ? "Paused. Pick up when ready." : "Make room for one useful step."}</p><div className="today-timer-actions"><button className="today-primary" disabled={!remaining} onClick={toggle}>{running ? <Pause size={16}/> : <Play size={16}/>} {running ? "Pause" : elapsed ? "Resume" : "Start focus"}</button><button className="today-icon-button" onClick={() => reset()} aria-label="Reset focus timer" title="Reset focus timer"><RotateCcw size={17}/></button></div><small className="today-muted">{timerSaved ? "Timer saved on this device. Keeps time when you leave." : "Timer couldn’t be saved. Keep this page open."}</small></div>
    <div className="today-resume-note"><label htmlFor="today-return-note">Leave a thread for your future self</label><textarea id="today-return-note" value={note} maxLength={600} rows={2} placeholder="Where did you stop? What should you try next?" onChange={(event) => { setNote(event.target.value); setNoteSaved(saveLocal(noteKey, event.target.value)); }}/><span>{noteSaved ? "Saved on this device, just for this task." : "Couldn’t save on this device. Copy your note before leaving."}</span></div>
  </div>;
}
