const {test,afterEach,mock} = require('node:test');
const assert = require('node:assert/strict');
const service = require('../services/studyContentService');
const {fetchVideo} = require('../services/youtubeMetadataService');
const Lesson = require('../Models/StudyLesson');
const Subject = require('../Models/StudySubject');
const Doubt = require('../Models/StudyDoubt');
const User = require('../Models/User');
const controller = require('../Controllers/studyContentController');
const staff = require('../middleWare/studyStaff');
const student = '111111111111111111111111';
const mentor = '222222222222222222222222';
const videoId = service.courses[0].lessons[0].videoId;
const response = () => ({code:200,body:null,status(n){this.code=n;return this;},set(){return this;},json(data){this.body=data;return this;}});
const chain = value => ({select(){return this;},sort(){return this;},limit(){return this;},lean:async()=>value});
const call = async(fn,req) => {const res=response();await fn(req,res,e=>{res.code=e.status||500;res.body={message:e.message};});return res;};
afterEach(()=>mock.restoreAll());
test('YouTube import only accepts recognised HTTPS video links, not arbitrary fetch targets',()=>{
  for(const url of [`https://youtu.be/${videoId}`,`https://www.youtube.com/watch?v=${videoId}`,`https://youtube.com/shorts/${videoId}`])assert.equal(service.youtubeId(url),videoId);
  for(const url of ['https://evil.test/watch?v=abcdefghijk','http://youtu.be/abcdefghijk','https://user:pass@youtube.com/watch?v=abcdefghijk','https://youtube.com/playlist?list=foo','https://youtube.com/watch?v=bad'])assert.throws(()=>service.youtubeId(url));
});
test('subject metadata and lesson quizzes/resources enforce bounds and safe links',()=>{
  const subject=service.validateSubject({id:'test-new-subject',title:'Test subject',code:'TEST',branch:'electrical',year:3,semester:5,units:['One','Two','Three','Four','Five']});
  assert.equal(subject.units.length,5);
  assert.throws(()=>service.validateSubject({...subject,branch:'electrical',semester:1,units:['One','Two','Three','Four','Five']}));
  const input={subjectId:subject.id,url:`https://youtu.be/${videoId}`,title:'A lesson',unit:1,published:true,resources:[{title:'Notes',url:'https://example.com/notes.pdf',kind:'notes'}],quiz:[{question:'Question?',options:['A','B','C','D'],correct:2,explanation:'Reason'}]};
  const lesson=service.validateLesson(input);
  assert.equal(lesson.quiz[0].correct,2);
  assert.deepEqual(service.publicLesson(lesson).quiz,[{question:'Question?',options:['A','B','C','D']}]);
  assert.throws(()=>service.validateLesson({...input,resources:[{title:'Bad',url:'javascript:alert(1)',kind:'notes'}]}));
  assert.throws(()=>service.validateLesson({...input,quiz:[{...input.quiz[0],correct:4}]}));
});
test('metadata import supports basic fallback and rejects videos with embedding disabled',async()=>{
  const basic=await fetchVideo(`https://youtu.be/${videoId}`,async()=>({ok:true,json:async()=>({title:'Imported title',author_name:'Mentor'})}),null);
  assert.equal(basic.title,'Imported title');assert.equal(basic.minutes,0);assert.match(basic.notice,/manually/);
  await assert.rejects(()=>fetchVideo(`https://youtu.be/${videoId}`,async()=>({ok:true,json:async()=>({items:[{status:{embeddable:false}}]})}),'test-key'),/embedding/);
  const rich=await fetchVideo(`https://youtu.be/${videoId}`,async()=>({ok:true,json:async()=>({items:[{status:{embeddable:true},snippet:{title:'Title',channelTitle:'Mentor',description:'Summary'},contentDetails:{duration:'PT1H2M30S'}}]})}),'test-key');
  assert.equal(rich.minutes,63);assert.equal(rich.summary,'Summary');
});
test('public catalog contains published lessons and no quiz answer keys or drafts',async()=>{
  mock.method(Lesson,'find',()=>chain([{subjectId:'s',videoId,published:true,quiz:[{question:'Q',options:['A','B','C','D'],correct:1,explanation:'Secret reason'}]},{subjectId:'s',videoId:'abcdefghijk',published:false,title:'Secret draft'}]));
  mock.method(Subject,'find',()=>chain([]));
  const res=await call(controller.catalog,{});
  assert.equal(res.body.lessons.length,1);
  const json=JSON.stringify(res.body);
  assert(!json.includes('Secret draft'));assert(!json.includes('correct'));assert(!json.includes('Secret reason'));
});
test('guest and student question queries restrict private visibility; owner identifiers are not exposed',async()=>{
  mock.method(Lesson,'exists',async()=>true);
  mock.method(User,'findById',()=>chain({email:'student@example.com'}));
  let query;
  mock.method(Doubt,'find',q=>{query=q;return chain([{_id:student,userId:student,videoId,author:'Student',text:'Question',visibility:'public',replies:[]}]);});
  const guest=await call(controller.questions,{params:{videoId}});
  assert.deepEqual(query.$or,[{visibility:'public'}]);assert(!JSON.stringify(guest.body).includes('userId'));
  const own=await call(controller.questions,{params:{videoId},auth:{id:student}});
  assert.deepEqual(query.$or,[{visibility:'public'},{userId:student}]);assert.equal(own.body.doubts[0].isMine,true);
});
test('mentor access is enforced by email allowlist, not request claims',async()=>{
  const previous=process.env.MENTOR_EMAILS;
  process.env.MENTOR_EMAILS='mentor@example.com';
  try {
    mock.method(User,'findById',id=>chain({email:id===mentor?'mentor@example.com':'student@example.com'}));
    let next=false;
    const res=response();await staff.requireStaff({auth:{id:student},body:{role:'mentor'}},res,()=>{next=true;});
    assert.equal(res.code,403);assert.equal(next,false);
    await staff.requireStaff({auth:{id:mentor}},response(),()=>{next=true;});assert.equal(next,true);
  } finally {if(previous===undefined) delete process.env.MENTOR_EMAILS;else process.env.MENTOR_EMAILS=previous;}
});
test('questions use authenticated ownership and only the owner can resolve',async()=>{
  mock.method(Lesson,'exists',async()=>true);
  mock.method(Doubt,'countDocuments',async()=>0);
  mock.method(User,'findById',()=>chain({name:'Student'}));
  let created,query;
  mock.method(Doubt,'create',async values=>{created=values;return {...values,_id:mentor};});
  await call(controller.ask,{params:{videoId},auth:{id:student},body:{text:'Why?',seconds:42,visibility:'private',userId:mentor}});
  assert.equal(created.userId,student);assert.equal(created.visibility,'private');
  mock.method(Doubt,'findOneAndUpdate',async q=>{query=q;return null;});
  const res=await call(controller.resolve,{params:{id:mentor},auth:{id:student},body:{resolved:true}});
  assert.equal(query.userId,student);assert.equal(res.code,404);
});
test('quiz grading rejects missing/invalid answers and returns explanations after submission',async()=>{
  mock.method(Lesson,'findOne',()=>chain({quiz:[{correct:2,explanation:'Because…'}]}));
  const req={params:{id:mentor},body:{answers:[2]}};
  const correct=await call(controller.grade,req);assert.equal(correct.body.score,1);assert.equal(correct.body.results[0].explanation,'Because…');
  const invalid=await call(controller.grade,{...req,body:{answers:[null]}});assert.equal(invalid.code,400);
});
test('duplicate bundled videos require explicit edit; editing keeps the stable video identifier',async()=>{
  const subject=service.catalog.subjects.find(s=>s.lectureCollection&&service.courses.some(c=>c.id===s.lectureCollection));
  const lesson=service.courses.find(c=>c.id===subject.lectureCollection).lessons.find(l=>l.unit>0);
  mock.method(Lesson,'findOne',async()=>null);
  let stored;
  mock.method(Lesson,'findOneAndUpdate',async(query,update)=>{stored={query,values:update.$set};return update.$set;});
  const body={subjectId:subject.id,url:lesson.url,title:'Updated title',unit:lesson.unit,published:false};
  assert.equal((await call(controller.saveLesson,{body})).code,409);
  assert.equal((await call(controller.saveLesson,{body:{...body,edit:true}})).code,200);
  assert.equal(stored.query.videoId,lesson.videoId);assert.equal(stored.values.published,false);
});
test('new published subjects register for existing notebooks and tutor without changing static curriculum',async()=>{
  const dynamic = require('../middleWare/dynamicStudySubject');
  const {notebookKey}=require('../services/studyProgressService');
  const {resolveUnit}=require('../services/studyAssistantService');
  const subject={id:'custom-subject-test',title:'Custom subject',code:'TEST',branches:['electrical'],year:3,semesters:[5],scheme:2022,source:'newbert',lectureCollection:'custom-subject-test',units:[1,2,3,4,5].map(number=>({number,title:`Topic ${number}`}))};
  const originalCount=service.catalog.subjects.length;
  mock.method(Lesson,'distinct',async()=>[subject.id]);mock.method(Subject,'find',()=>chain([subject]));
  try {
    let next=false;await dynamic({},response(),e=>{if(e)throw e;next=true;});
    assert(next);assert.equal(notebookKey.test(`unit:electrical:${subject.id}:1`),true);
    assert.equal(notebookKey.test(`unit:civil:${subject.id}:1`),false);
    assert.equal(resolveUnit('electrical',subject.id,1).source.managed,true);
    await dynamic({},response(),()=>{});assert.equal(service.catalog.subjects.length,originalCount+1);
  } finally {service.catalog.subjects.splice(originalCount);delete service.catalog.sources.newbert;}
});
