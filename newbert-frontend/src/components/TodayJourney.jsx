import { ArrowRight, Check, Flag, Layers3 } from "lucide-react";
import { Link } from "react-router-dom";
import { planTotals } from "../utils/todayPersonalization";

export function TodayProgress({ plans }) {
  const { completed, total } = planTotals(plans);
  const percent = total ? completed / total * 100 : 0;
  return <div className="today-progress-art">
    <div className="today-orbit" aria-hidden="true"><span/><span/><span/></div>
    <div className="today-progress-ring">
      <svg viewBox="0 0 160 160" aria-hidden="true"><circle className="today-ring-track" cx="80" cy="80" r="68"/><circle className="today-ring-value" cx="80" cy="80" r="68" pathLength="100" strokeDasharray={`${percent} 100`}/></svg>
      <div><strong>{completed}<span>/{total}</span></strong><small>plan tasks done</small></div>
    </div>
    <p>{total ? "Your effort is taking shape." : "Your first step starts with a plan."}</p>
    <span className="today-art-caption">{total ? "From your saved skill plans" : "Choose a skill in My Plan"}</span>
  </div>;
}

export default function TodayJourney({ plans, selectedPlan, onSelect }) {
  return <section className="today-journey" aria-label="Your skill plan journey">
    <div className="today-section-heading"><h2><Layers3 size={19}/>What you’re building</h2><Link to="/roadmap">My Plan <ArrowRight size={15}/></Link></div>
    <p className="today-section-note">Pick a skill to see its next step. Each completed task fills in your path.</p>
    {plans.length ? <div className="today-plan-grid">{plans.map((plan) => {
      const verified = plan.status === "verified";
      const review = plan.status === "evidence_submitted";
      const complete = plan.total > 0 && plan.completed === plan.total;
      const status = verified ? "Evidence verified" : review ? "Evidence in review" : complete ? "Ready to submit evidence" : `${plan.total - plan.completed} tasks to go`;
      const percent = plan.total ? plan.completed / plan.total * 100 : 0;
      const content = <><span className="today-plan-top"><span>{plan.skillName}</span>{verified ? <Check size={16}/> : <ArrowRight size={15}/>}</span><span className="today-plan-track" aria-hidden="true"><span style={{ width: `${percent}%` }}/></span><span className="today-plan-bottom"><span>{plan.completed}/{plan.total} done</span><span>{status}</span></span></>;
      return verified || review || complete || !plan.total ? <Link key={plan.id} className="today-plan" to="/roadmap">{content}</Link> : <button key={plan.id} className="today-plan" aria-pressed={selectedPlan === plan.id} onClick={() => onSelect(plan.id)}>{content}</button>;
    })}</div> : <Link to="/roadmap" className="today-journey-empty"><Flag size={24}/><span><strong>Give your goal a first milestone</strong><small>Choose one skill. Your task journey will appear here.</small></span><ArrowRight size={18}/></Link>}
    <p className="today-muted">Task completion tracks your plan. Skill verification comes from reviewed evidence.</p>
  </section>;
}
