const aliases = { js: "javascript", "node.js": "nodejs", "node js": "nodejs", "react.js": "react", reactjs: "react", "react js": "react", "c++": "cpp", "c plus plus": "cpp", "c#": "csharp", "c sharp": "csharp", "structured query language": "sql", "database management systems": "dbms", "database management system": "dbms", "data structures and algorithms": "dsa" };
export function skillId(value) { const normalized = String(value || "").trim().toLowerCase().replace(/\s+/g," "); return aliases[normalized] || normalized; }
function skillMap(skills) {
  return new Map((Array.isArray(skills)?skills:[]).map(s=>typeof s === "string" ? s : s?.name).filter(s=>typeof s === "string" && s.trim()).map(s=>[skillId(s),s.trim()]));
}
function count(value) { return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null; }

export function comparePublicProfile(own, peer) {
  if (!own || !peer || peer.private || String(own.userId) === String(peer.userId)) return null;
  const mine = skillMap(own.skills);
  const theirs = skillMap(peer.skills);
  const visibleSkills = Array.isArray(peer.skills);
  const shared = [...theirs].filter(([id])=>mine.has(id)).map(([,name])=>name);
  const explore = [...theirs].filter(([id])=>!mine.has(id)).map(([,name])=>name);
  const unique = visibleSkills ? [...mine].filter(([id])=>!theirs.has(id)).map(([,name])=>name) : [];
  const metrics = [
    { id:"leetcode",label:"LeetCode problems solved",you:count(own.leetcodeStats?.totalSolved),peer:peer.leetcode?.connected?count(peer.leetcode.totalSolved):null,source:"Connected LeetCode accounts. A solved count is not a skill grade.",action:"Practice a problem and explain your approach; use review quality as well as volume." },
    { id:"repos",label:"Public GitHub repositories",you:count(own.githubStats?.publicRepos),peer:peer.github?.connected?count(peer.github.publicRepos):null,source:"Public repository counts. Size and quality vary between repositories.",action:"Improve one project with a clear README, a working demo and tests." },
    { id:"projects",label:"Public featured projects",you:Array.isArray(own.projectDetails)?own.projectDetails.filter(p=>p.isFeatured===true&&p.visibility!=="private").slice(0,3).length:null,peer:peer.projects?count(peer.projects.count):null,source:"Only publicly featured projects, up to three per profile.",action:"Pin a project that shows your contribution, decisions and what you learned." },
  ].map(row=>({...row,delta:row.you!=null&&row.peer!=null?row.peer-row.you:null}));
  return { shared,explore,unique,visibleSkills,peerSkillCount:theirs.size,ownSkillCount:mine.size,
    overlap:visibleSkills&&theirs.size?Math.round(shared.length/theirs.size*100):null,metrics,
    comparable:metrics.filter(row=>row.delta!=null).length,
    sameTarget:peer.careerGoal?.role&&own.targetRole?skillId(peer.careerGoal.role)===skillId(own.targetRole):null,
  };
}
