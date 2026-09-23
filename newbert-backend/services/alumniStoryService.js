const {relevantQuestions}=require('./alumniQuestionEngine');
const {visibility}=require('./alumniChatValidation');
const {COLLECTION_TYPES}=require('../config/alumniQuestions');
function defaultVisibility(path){return /(?:ctc|baseSalary|stipend|price)$/.test(path)?'COLLEGE_ONLY':/(?:verification|email|phone)/i.test(path)?'PRIVATE':'PUBLIC';}
function privacyFields(answers){const fields=[];function visit(field,prefix,label){if(field.type==='object'||COLLECTION_TYPES.includes(field.type)){fields.push({key:prefix,label,default:defaultVisibility(prefix)});for(const child of field.fields||[])visit(child,`${prefix}.${child.id}`,`${label} / ${child.label}`);}else fields.push({key:prefix,label,default:defaultVisibility(prefix)});}
 for(const q of relevantQuestions(answers)){if(['privacy','platforms','verificationSources'].includes(q.id))continue;visit(q,q.id,q.text);}return fields;}
function permitted(path,privacy,sameCollege){const parts=path.split('.');let rule=defaultVisibility(path);for(let i=1;i<=parts.length;i++){const candidate=privacy[parts.slice(0,i).join('.')];if(visibility.includes(candidate)){if(candidate==='PRIVATE'||candidate==='COLLEGE_ONLY'&&!sameCollege)return false;rule=candidate;}}
 // A parent's PUBLIC setting never relaxes a sensitive descendant's default.
 const leaf=privacy[path]||defaultVisibility(path);return rule!=='PRIVATE'&&(leaf==='PUBLIC'||leaf==='COLLEGE_ONLY'&&sameCollege);
}
function redactStory(story,privacy={},sameCollege=false){
 function redact(value,path){if(!permitted(path,privacy,sameCollege))return undefined;if(Array.isArray(value))return value.map(v=>v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,item])=>[k,redact(item,`${path}.${k}`)]).filter(([,v])=>v!==undefined)):v);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,redact(v,`${path}.${k}`)]).filter(([,v])=>v!==undefined));return value;}
 const result={};for(const [id,value]of Object.entries(story||{})){if(['privacy','verificationSources','platforms'].includes(id))continue;const clean=redact(value,id);if(clean!==undefined)result[id]=clean;}return result;
}
function practiceProfiles(answers){return Object.entries(answers).filter(([key])=>key.startsWith('practice:')).flatMap(([,value])=>Array.isArray(value)?value:[value]);}
function legacyFields(a){
 const placement=a.placement||{},gate=a.gateProfile||{},prep=a.preparation||{},dsa=a.dsaPreparation||{};
 const gatePath=['GATE','PSU'].includes(a.careerPath);const placementPath=['PLACEMENT','OFF_CAMPUS','INTERNSHIP_PPO'].includes(a.careerPath);
 const phases=(a.preparationJourney||[]).map((p,i)=>({...p,order:i+1}));const skills=(a.skillsAtSelection||[]).map(s=>s.name).filter(Boolean);
 const outcome={company:placement.company,role:placement.role,packageLpa:placement.ctc,offerType:placement.offerType,placementYear:placement.offerYear,location:placement.location};
 const practice=practiceProfiles(a);const github=practice.find(p=>p.platform==='GITHUB');
 return {name:a.name||'Alumni',college:a.college?.name,branch:a.branch,batch:a.graduationYear,graduationYear:a.graduationYear,
  company:placement.company||a.psuProfile?.name||a.careerOutcome?.organisation,role:placement.role||a.psuProfile?.role||a.careerOutcome?.title,
  path:gatePath?'gate':placementPath?'placement':'other',outcomeType:gatePath?'gate':placementPath?'placement':'other',careerPaths:gatePath?['gate']:placementPath?['placement']:[],
  avatarUrl:a.introduction?.avatarUrl,bio:a.introduction?.bio,cgpa:a.academics?.cgpa,academics:a.academics,
  package:placement.ctc,gateAIR:gate.air,skills,dsaSolved:dsa.solvedAtSelection,projects:a.projects?.length,projectsDetail:a.projects,internships:a.internships,
  preparationMonths:prep.months,placementOutcome:placementPath?outcome:null,
  placementPreparation:placementPath?{preparationMonths:prep.months,averageHoursPerDay:prep.hoursPerDay,dsa:{...dsa,totalSolved:dsa.solvedAtSelection},development:{skills,projects:a.projects||[]},internships:a.internships||[],preparationPhases:phases}:null,
  gateOutcome:gatePath?{paper:gate.paper,examYear:gate.year,marks:gate.marks,score:gate.score,air:gate.air,institute:gate.institute,program:gate.specialization,psu:a.psuProfile?.name,psuRole:a.psuProfile?.role,outcomeType:a.careerPath==='PSU'?'psu':'other'}:null,
  gatePreparation:gatePath?{preparationMonths:prep.months,averageHoursPerDay:prep.hoursPerDay,strongSubjects:gate.strongSubjects||[],weakSubjects:gate.weakSubjects||[],preparationPhases:phases}:null,
  advice:a.advice,adviceDetails:{...(a.adviceDetails||{}),adviceForJuniors:a.advice},interviewExperience:a.interviews,
  courses:(a.resources||[]).map(r=>({courseName:r.name,provider:r.platform,category:r.kind,path:gatePath?'gate':'placement',subjectOrSkill:r.topic,rating:r.rating,review:r.disliked,wouldRecommend:r.recommend})),
  practiceProfiles:practice,socialLinks:a.socialLinks,github:github?{username:github.username,profileUrl:github.profileUrl,verified:false}:null,
  mentorshipEnabled:a.mentorInterest==='YES'&&Boolean(a.mentorship),availableTopics:a.mentorship?.topics||[],
 };
}
module.exports={defaultVisibility,privacyFields,permitted,redactStory,legacyFields,practiceProfiles};
