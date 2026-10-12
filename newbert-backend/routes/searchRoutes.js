const router = require('express').Router();
router.use(require('../middleWare/authMiddleware'));
const Profile = require('../Models/Profile');
const Alumni = require('../Models/Alumni');
const StudyLesson = require('../Models/StudyLesson');
const StudySubject = require('../Models/StudySubject');
const catalog = require('../data/academicCatalog.json');
const { publicAlumniQuery, serializePublicAlumni } = require('../services/alumniPublicService');
const { normalizePrivacy } = require('../services/publicProfileService');
const { searchPattern } = require('../services/searchService');
const courses = require('../data/studyVideos.json');

router.get('/', async (req,res,next) => {
  const pattern=searchPattern(req.query.q);
  if(!pattern)return res.json({results:[]});
  try {
    const [students,seniors,subjects]=await Promise.all([
      Profile.aggregate([
        {$match:{onboardingCompleted:true,'privacy.profileVisibility':{$ne:'private'},'privacy.visibility':{$ne:'private'},visibility:{$ne:'private'}}},
        {$lookup:{from:'users',localField:'userId',foreignField:'_id',as:'person'}},{$unwind:'$person'},
        {$match:{$or:[{'person.name':pattern},{collegeName:pattern}]}},{$limit:12},
        {$project:{userId:1,collegeName:1,privacy:1,visibility:1,'person.name':1}}
      ]).option({maxTimeMS:3000}),
      Alumni.find(publicAlumniQuery({$or:[{name:pattern},{collegeName:pattern},{college:pattern}]})).limit(12).maxTimeMS(3000).lean(),
      StudySubject.find().select('id title code branches').maxTimeMS(3000).lean()
    ]);
    const allSubjects=[...new Map([...catalog.subjects,...subjects].map(s=>[s.id,s])).values()];
    const records=await StudyLesson.find().select('subjectId videoId title unit published').maxTimeMS(3000).lean();
    const baseline=allSubjects.flatMap(subject=>(courses.find(c=>c.id===subject.lectureCollection)?.lessons || []).filter(l=>l.unit>0&&!records.some(r=>r.subjectId===subject.id&&r.videoId===l.videoId)).map(l=>({...l,subjectId:subject.id})));
    const lessons=[...records.filter(r=>r.published),...baseline].filter(l=>{const subject=allSubjects.find(s=>s.id===l.subjectId);return pattern.test(`${l.title} ${subject?.title || ''} ${subject?.code || ''}`);}).slice(0,12);
    const people=students.filter(p=>normalizePrivacy(p.privacy,p.visibility).profileVisibility==='public').map(p=>({type:'Student',title:p.person.name,detail:p.collegeName || 'Registered student',url:`/profile/${p.userId}`}));
    const alumni=seniors.map(s=>serializePublicAlumni(s)).filter(s=>pattern.test(`${s.name || ''} ${s.collegeName || s.college || ''}`)).map(s=>({type:'Senior',title:s.name || 'Senior',detail:typeof(s.collegeName || s.college)==='string' ? s.collegeName || s.college : 'Alumni story',url:`/alumni-wall/${s._id}`}));
    const lectures=lessons.flatMap(l=>{const subject=allSubjects.find(s=>s.id===l.subjectId);return subject?.branches?.[0] ? [{type:'Lecture',title:l.title,detail:`${subject.title} · Unit ${l.unit}`,url:`/study/branch/${subject.branches[0]}/subject/${subject.id}?unit=${l.unit}&lesson=${l.videoId}`}]:[];});
    res.json({results:[...people,...alumni,...lectures].slice(0,30)});
  } catch(error) { next(error); }
});
module.exports=router;
