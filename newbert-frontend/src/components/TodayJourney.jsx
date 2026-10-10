import { ArrowRight, Check, Flag, Layers3 } from "lucide-react";
import { Link } from "react-router-dom";
import { planTotals } from "../utils/todayPersonalization";

export function TodayProgress({ plans }) {
  const { completed, total } = planTotals(plans);
  const percent = total ? completed / total * 100 : 0;
  const stages = ["Start", "Tasks", "Evidence", "Review"];
  const stage = !total ? 0 : plans.every(p=>p.status === "verified") ? 3 : plans.every(p=>["verified", "evidence_submitted"].includes(p.status)) || completed === total ? 2 : 1;
  return <div className="today-progress-art">
    <div className="today-path-summary"><span>YOUR PLAN</span><strong>{completed}<small> / {total}</small></strong><span>tasks complete</span></div>
    <svg className="today-path-art" viewBox="0 0 400 150" role="img" aria-label={`${completed} of ${total} tasks complete. Current stage: ${stages[stage]}. Task completion is separate from evidence review.`}>
      <path className="today-path-track" d="M35 100 C85 100 85 45 145 45 S215 100 265 100 S310 45 365 45"/>
      <path className="today-path-fill" pathLength="100" strokeDasharray={`${stage === 3 ? 100 : stage === 2 ? 70 : total ? 8 + percent * .55 : 0} 100`} d="M35 100 C85 100 85 45 145 45 S215 100 265 100 S310 45 365 45"/>
      {[[35,100],[145,45],[265,100],[365,45]].map(([x,y],i)=><g key={stages[i]} className={i<=stage ? "today-path-node reached" : "today-path-node"}><circle cx={x} cy={y} r="10"/><text x={x} y={y+30} textAnchor="middle">{stages[i]}</text>{i===stage&&<circle className="today-path-halo" cx={x} cy={y} r="17"/>}</g>)}
    </svg>
    <Link className="today-path-action" to="/roadmap">{stage===3 ? "View reviewed evidence" : stage===2 ? "Open evidence & review" : total ? "Continue My Plan" : "Create your first plan"}<ArrowRight size={15}/></Link>
  </div>;
}

export default function TodayJourney({ plans, selectedPlan, onSelect }) {
  return <section className="today-journey" aria-label="Your skill plan journey">
    <div className="today-section-heading"><h2><Layers3 size={19}/>What you’re building</h2><Link to="/roadmap">My Plan <ArrowRight size={15}/></Link></div>
    <p className="today-section-note">Choose a skill. Follow its next step.</p>
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
