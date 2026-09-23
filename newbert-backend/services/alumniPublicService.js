const {redactStory,legacyFields}=require('./alumniStoryService');
function dummyDataEnabled(){return String(process.env.ALLOW_DUMMY_ALUMNI || "true").toLowerCase()!=="false";}
function publicAlumniQuery(extra={}){return {$and:[{$or:[{publicationStatus:'PUBLISHED'},{publicationStatus:{$exists:false},verified:true}]},{'privacy.profile':{$nin:[false,'PRIVATE']}},...(dummyDataEnabled()?[]:[{isDummyData:{$ne:true}}]),extra]};}
function serializePublicAlumni(record,viewer={}){
 if(record.onboardingVersion===1){
  const sameCollege=Boolean(viewer?.collegeId&&record.collegeId&&String(viewer.collegeId)===String(record.collegeId));
  const story=redactStory(record.story,record.privacy,sameCollege);
  return {...legacyFields(story),collegeId:story.college?.collegeId,collegeName:story.college?.name,_id:record._id,createdAt:record.createdAt,publishedAt:record.publishedAt,verified:Boolean(record.verified),publicationStatus:record.publicationStatus,story};
 }
 const allowed=['_id','name','college','collegeId','collegeRef','collegeName','batch','company','role','careerPaths','outcomeType','path','branch','graduationYear','package','gateAIR','skills','dsaSolved','projects','githubPublicRepos','cgpa','avatarUrl','bio','academics','achievements','journey','preparationMonths','internships','projectsDetail','advice','interviewExperience','placement','dsa','github','csFundamentals','gate','core','placementOutcome','placementPreparation','gateOutcome','gatePreparation','courses','adviceDetails','mentorshipEnabled','availableTopics','isDummyData','isDemo','verified','createdAt','updatedAt'];
 const alumni=Object.fromEntries(allowed.filter(k=>Object.hasOwn(record,k)).map(k=>[k,record[k]]));
 const privacy={academics:true,preparation:true,courses:true,advice:true,mentorship:true,...(record.privacy||{})};
 if(!privacy.academics){delete alumni.academics;delete alumni.cgpa;}
 if(!privacy.preparation)for(const key of ['placementPreparation','gatePreparation','dsa','dsaSolved','csFundamentals','journey','preparationMonths','projectsDetail','interviewExperience'])delete alumni[key];
 if(!privacy.courses)delete alumni.courses;
 if(!privacy.advice){delete alumni.advice;delete alumni.adviceDetails;}
 if(!privacy.mentorship){alumni.mentorshipEnabled=false;delete alumni.availableTopics;}
 return alumni;
}
module.exports={dummyDataEnabled,publicAlumniQuery,serializePublicAlumni};
