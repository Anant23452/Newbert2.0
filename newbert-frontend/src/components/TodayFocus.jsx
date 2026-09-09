import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Clock3, Pause, Play, RefreshCw, RotateCcw, Target } from "lucide-react";

export default function TodayFocus({ tasks, busy, onComplete, activePlans, syncing }) {
  const [selected, setSelected] = useState("");
  const taskKey = (task) => `${task.planId}:${task.id}`;
  const task = tasks.find((item) => taskKey(item) === selected) || tasks[0];
  return <section className="today-focus" aria-label="Your focus workspace">
    <div className="today-section-heading"><h2><Target size={19}/>Your next steps</h2><Link to="/roadmap">Full plan <ArrowRight size={15}/></Link></div>
    {task ? <>
      <div className="today-task-picker" aria-label="Choose a task">{tasks.map((item, index) => <button key={taskKey(item)} aria-pressed={taskKey(item) === taskKey(task)} onClick={() => setSelected(taskKey(item))}><span className="today-task-number">{String(index + 1).padStart(2, "0")}</span><span><strong>{item.title}</strong><small>{item.skillName}{item.estimatedMinutes ? ` · ${item.estimatedMinutes} min` : ""}</small></span><ArrowRight size={16}/></button>)}</div>
      <FocusSession key={taskKey(task)} task={task} busy={busy} onComplete={onComplete}/>
    </> : <div className="today-focus-empty"><Target size={34}/><h3>{activePlans ? "Review your progress and submit evidence" : "Choose your first preparation milestone"}</h3><p>{syncing ? "Your connected accounts are updating. Your career target is a good place to start." : activePlans ? "Your task queue is clear. Turn the work you have done into evidence for your skill plan." : "Start with one skill that matters to your target role. A small, concrete milestone is enough."}</p><Link className="today-primary" to="/roadmap">Open My Plan <ArrowRight size={16}/></Link></div>}
  </section>;
}

function FocusSession({ task, busy, onComplete }) {
  const [minutes, setMinutes] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const deadline = useRef(0);
  useEffect(() => {
    if (!running) return undefined;
    // Wall-clock time stays accurate when the browser throttles background tabs.
    const tick = () => { const left = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)); setRemaining(left); if (!left) setRunning(false); };
    const interval = setInterval(tick, 250);
    tick();
    return () => clearInterval(interval);
  }, [running]);
  const reset = (duration = minutes) => { setRunning(false); setMinutes(duration); setRemaining(duration * 60); };
  const toggle = () => { if (running) { setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))); setRunning(false); } else { deadline.current = Date.now() + remaining * 1000; setRunning(true); } };
  const elapsed = minutes * 60 - remaining;
  return <div className="today-session">
    <div className="today-session-copy"><p className="today-eyebrow">One step toward your target</p><h3>{task.title}</h3><p>{task.description}</p><div className="today-session-meta"><span><Target size={14}/>{task.skillName}</span><span><Clock3 size={14}/>{task.estimatedMinutes ? `${task.estimatedMinutes} min estimate` : "Your saved plan"}</span></div><button className="today-primary" disabled={Boolean(busy)} onClick={() => onComplete(task)} aria-label={`Mark ${task.title} complete`}>{busy === task.id ? <RefreshCw size={16} className="animate-spin"/> : <Check size={16}/>}Mark complete</button><small className="today-muted">Task progress, separate from verified coding activity.</small></div>
    <div className="today-timer"><div className="today-duration" role="group" aria-label="Focus duration">{[15, 25, 45].map((value) => <button key={value} aria-pressed={minutes === value} onClick={() => reset(value)}>{value}m</button>)}</div><div className="today-clock" role="timer" aria-label="Focus time remaining">{String(Math.floor(remaining / 60)).padStart(2, "0")}<span>:</span>{String(remaining % 60).padStart(2, "0")}</div><progress max={minutes * 60} value={elapsed} aria-label="Focus session progress"/><p role="status">{remaining === 0 ? "Session finished. Take a breath." : running ? "A little progress, right now." : elapsed ? "Paused. Pick up when ready." : "Make room for one useful step."}</p><div className="today-timer-actions"><button className="today-primary" disabled={!remaining} onClick={toggle}>{running ? <Pause size={16}/> : <Play size={16}/>} {running ? "Pause" : elapsed ? "Resume" : "Start focus"}</button><button className="today-icon-button" onClick={() => reset()} aria-label="Reset focus timer" title="Reset focus timer"><RotateCcw size={17}/></button></div></div>
  </div>;
}
