import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, GitCompareArrows, LockKeyhole, Target } from "lucide-react";
import { comparePublicProfile } from "../utils/profileComparison";
import "../profileComparison.css";

export default function ProfileComparison({ own, peer }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("explore");
  const [selected, setSelected] = useState("");
  if (peer.private || peer.isOwner || own?.userId === peer.userId) return null;
  const result = comparePublicProfile(own,peer);
  const firstName = peer.name?.split(" ")[0] || "this student";
  const list = result?.[filter] || [];
  const selectedSkill = list.includes(selected)?selected:list[0];
  return <section className="peer-comparison" aria-label="Compare your skills">
    <div className="peer-compare-heading"><span className="peer-compare-icon"><GitCompareArrows size={24}/></span><div><p className="peer-eyebrow">A USEFUL COMPARISON</p><h2>Your skills, beside {firstName}’s.</h2><p>See your shared ground, differences and a practical next step.</p></div>{own?<button aria-expanded={open} className="peer-primary" onClick={()=>setOpen(!open)}>{open?'Close comparison':'Compare with me'}<ArrowRight size={16}/></button>:<Link className="peer-primary" to="/profile">Sign in to compare <ArrowRight size={16}/></Link>}</div>
    {open&&result&&<div className="peer-compare-content">
      <div className="peer-compare-overview"><div className="peer-overlap" style={{'--overlap':`${result.overlap||0}%`}}><div><strong>{result.overlap==null?'—':`${result.overlap}%`}</strong><span>listed skill overlap</span></div></div><div><h3>{result.shared.length?`${result.shared.length} shared ${result.shared.length===1?'skill':'skills'}. A place to build from.`:'Start with what is visible.'}</h3><p>{result.visibleSkills?`You list ${result.shared.length} of ${firstName}’s ${result.peerSkillCount} public skills. ${result.explore.length} are not yet listed in your profile.`:'This student has not shared a public skill list. Skill overlap is unavailable.'}</p><small>Overlap measures profile listings, not proficiency or placement readiness.</small>{result.sameTarget===false&&<p className="peer-target-context">Your career targets differ. Choose gaps that help your own goal: {own.targetRole}.</p>}</div></div>
      <div className="peer-tabs" role="group" aria-label="Skill comparison filters">{[['explore','Explore next'],['shared','Shared skills'],['unique','Your other skills']].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>{setFilter(id);setSelected('');}}>{label}<span>{result[id].length}</span></button>)}</div>
      {result.visibleSkills?<><div className="peer-skill-chips">{list.length?list.map(skill=><button key={skill} aria-pressed={selectedSkill===skill} onClick={()=>setSelected(skill)}>{filter==='shared'&&<Check size={13}/>} {skill}</button>):<p>{filter==='explore'?'No additional skills in their public list. You can still strengthen the evidence behind yours.':'No skills in this group from the available profile listings.'}</p>}</div>{selectedSkill&&<div className="peer-next-step"><Target size={22}/><div><h3>{filter==='explore'?`Explore ${selectedSkill} if it supports your target.`:`Make your ${selectedSkill} work visible.`}</h3><p>{filter==='explore'?`It appears in ${firstName}’s public list and not in yours. If you already use it, update your profile; otherwise try a small exercise before starting a full plan.`:'Use a project or a worked problem to explain your decisions, test cases and tradeoffs. Matching a skill name does not mean the evidence is the same.'}</p><div><Link to={`/courses?search=${encodeURIComponent(selectedSkill)}`}>Find learning resources <ArrowRight size={14}/></Link><Link to="/profile">Update my evidence <ArrowRight size={14}/></Link></div></div></div>}</>:<p className="peer-unavailable"><LockKeyhole size={16}/>Public skills are unavailable. Hidden sections are excluded from this comparison.</p>}
      <div className="peer-heading-row"><h3>What the numbers actually say</h3><span>{result.comparable}/3 comparable measures</span></div>
      <div className="peer-metrics">{result.metrics.map(row=>{const max=Math.max(row.you||0,row.peer||0,1);return <article key={row.id}><div className="peer-metric-title"><h4>{row.label}</h4><strong>{row.delta==null?'Unavailable':row.delta===0?'Same count':row.delta>0?`${row.delta} more on their profile`:`${Math.abs(row.delta)} more on yours`}</strong></div><div className="peer-bars">{[['You',row.you,'you'],[firstName,row.peer,'them']].map(([name,value,id])=><div key={id}><span>{name}</span><div><i className={`peer-bar-${id}`} style={{width:value==null?'0%':`${value/max*100}%`}}/></div><b>{value??'—'}</b></div>)}</div><p>{row.source}</p>{row.delta>0&&<small>{row.action}</small>}</article>;})}</div>
      <p className="peer-compare-footnote">Compared from the data currently available in your profile and their public sections. Missing or private data stays unavailable. There is no reliable way to turn these counts into “days behind” or a measure of someone’s worth.</p>
    </div>}
  </section>;
}
