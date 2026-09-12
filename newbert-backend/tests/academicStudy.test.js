const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const catalog = require('../data/academicCatalog.json');
const {resolveUnit,prepareStudyRequest,answerStudyRequest} = require('../services/studyAssistantService');
const {validateStudyUpdate,serializeStudyRecord,notebookKey} = require('../services/studyProgressService');
const {createStudyAssistant} = require('../Controllers/studyAssistantController');
const StudyProgress = require('../Models/StudyProgress');
const controller = require('../Controllers/studentHomeController');
const key='unit:information-technology:it4-bcs071:1';
const body={branch:'information-technology',subjectId:'it4-bcs071',unit:1,action:'explain',language:'English',question:'How is elasticity different from scalability?'};
const response=()=>({code:200,body:null,status(n){this.code=n;return this;},json(data){this.body=data;return this;}});

test('all branches have both semesters in all four years and first-year schemes remain distinct',()=>{
  const ids=new Set();
  for(const subject of catalog.subjects){
    assert.ok(!ids.has(subject.id));ids.add(subject.id);
    assert.equal(subject.units.length,5);
    assert.deepEqual(subject.units.map(u=>u.number),[1,2,3,4,5]);
    assert.ok(subject.units.every(u=>typeof u.title==='string'&&u.title.length>3));
    assert.ok(catalog.sources[subject.source]);
    assert.match(catalog.sources[subject.source].url,/^https:\/\/(fms\.)?aktu\.ac\.in\//);
  }
  for(const branch of ['civil','electrical','information-technology'])for(let semester=1;semester<=8;semester++){
    assert.ok(catalog.subjects.some(s=>s.branches.includes(branch)&&s.semesters.includes(semester)),`${branch} sem ${semester}`);
  }
  for(const branch of ['civil','electrical','information-technology'])for(const scheme of [2022,2026]){
    assert.ok(catalog.subjects.some(s=>s.year===1&&s.branches.includes(branch)&&s.scheme===scheme));
  }
  assert.ok(catalog.subjects.filter(s=>s.scheme===2026).every(s=>s.year===1&&!s.lectureCollection));
});
test('frontend and server curriculum agree byte for byte',()=>{
  const frontend=fs.readFileSync(path.resolve(__dirname,'../../newbert-frontend/src/data/academicCatalog.json'),'utf8');
  assert.equal(frontend,fs.readFileSync(path.resolve(__dirname,'../data/academicCatalog.json'),'utf8'));
});
test('requested fourth-year subjects and elective restrictions match the published scheme',()=>{
  const it7=catalog.subjects.filter(s=>s.branches.includes('information-technology')&&s.semesters.includes(7));
  assert.ok(it7.some(s=>s.code==='BCS701'&&s.kind==='core'));
  assert.ok(it7.some(s=>s.code==='BCS071'&&s.kind==='elective'));
  assert.ok(it7.some(s=>s.code==='BOE070'&&s.kind==='open'));
  assert.ok(catalog.subjects.filter(s=>s.semesters.includes(8)).every(s=>s.kind==='open'));
  assert.equal(catalog.subjects.find(s=>s.id==='elective2-boe304').branches.includes('electrical'),false);
  assert.equal(catalog.subjects.find(s=>s.id==='elective2-boe306').branches.includes('information-technology'),false);
});
test('unit notebook preserves notes, recall and review while rejecting nonexistent or cross-branch units',()=>{
  const record=validateStudyUpdate({key,reflection:'Elastic capacity follows demand.',notes:[{id:'first',text:'Provision then release',seconds:0,kind:'note',resolved:false}],confidence:'good'},new Date('2026-09-12T00:00:00Z'));
  assert.equal(record.fields.reviewAt.toISOString(),'2026-09-15T00:00:00.000Z');
  assert.equal(serializeStudyRecord({key,...record.fields}).notes.length,1);
  assert.equal(notebookKey.test(key),true);
  assert.equal(notebookKey.test('unit:civil:it4-bcs071:1'),false);
  assert.equal(notebookKey.test('unit:information-technology:it4-bcs071:6'),false);
  assert.throws(()=>validateStudyUpdate({key:'unit:civil:invented:1',reflection:'text'}));
  assert.equal(new StudyProgress({userId:'60d0fe4f5311236168a109ca',key,...record.fields}).validateSync(),undefined);
});
test('unit account reads and writes cannot target a supplied third-party owner',async t=>{
  let filter,write;
  t.mock.method(StudyProgress,'findOne',q=>{filter=q;return {lean:async()=>({key,notes:[],reflection:'Private explanation'})};});
  t.mock.method(StudyProgress,'findOneAndUpdate',async(...args)=>{write=args;return {key,...args[1].$set};});
  const res=response();
  await controller.getLectureProgress({auth:{id:'owner'},query:{key,userId:'someone-else'}},res,e=>{throw e;});
  assert.deepEqual(filter,{userId:'owner',key});
  assert.equal(res.body.record.reflection,'Private explanation');
  await controller.updateStudyProgress({auth:{id:'owner'},body:{key,userId:'someone-else',reflection:'Changed'}},response(),e=>{throw e;});
  assert.deepEqual(write[0],{userId:'owner',key});assert.equal(write[1].$set.userId,undefined);
});
test('the tutor gets server-selected curriculum and only bounded, supported inputs',()=>{
  const result=prepareStudyRequest({...body,title:'Invented title',notes:'Never submitted',language:'Hinglish'});
  assert.match(result.prompt,/Cloud Computing/);assert.match(result.prompt,/Hinglish/);
  assert.ok(!result.prompt.includes('Invented title')&&!result.prompt.includes('Never submitted'));
  assert.equal(resolveUnit('civil','it4-bcs071',1),null);
  for(const invalid of [null,{...body,unit:'1'},{...body,unit:9},{...body,action:'__proto__'},{...body,language:'x'},{...body,question:'x'.repeat(1501)},{...body,answer:'x'.repeat(6001)},{...body,action:'feedback',answer:' '}])assert.throws(()=>prepareStudyRequest(invalid));
});
test('AI response is generated through the provider boundary and retains its source',async()=>{
  let supplied;
  const result=await answerStudyRequest(body,async args=>{supplied=args;return 'A provider test response';});
  assert.equal(result.answer,'A provider test response');assert.equal(result.unit,1);
  assert.equal(supplied.timeoutMs,30000);assert.match(result.source,/aktu\.ac\.in/);
  await assert.rejects(()=>answerStudyRequest(body,async()=>''));
});
test('provider outages do not become fake successful answers or expose secret provider errors',async()=>{
  const res=response();
  await createStudyAssistant(async()=>{throw new Error('secret upstream detail');})({body},res);
  assert.equal(res.code,503);assert.ok(!JSON.stringify(res.body).includes('secret'));
  assert.equal(res.body.answer,undefined);
  const quota=response();
  await createStudyAssistant(async()=>{throw {status:429,publicMessage:'Please try again shortly.'};})({body},quota);
  assert.equal(quota.code,429);
});
test('invalid tutor input fails before calling the provider',async()=>{
  let calls=0;const res=response();
  await createStudyAssistant(async()=>{calls++;})({body:{...body,branch:'civil'}},res);
  assert.equal(res.code,400);assert.equal(calls,0);
});
test('study assistant route follows authentication and uses the existing rate limiter',()=>{
  const router=require('../routes/profileRoutes');
  const authIndex=router.stack.findIndex(layer=>layer.handle.name==='requireAuth');
  const routeIndex=router.stack.findIndex(layer=>layer.route?.path==='/study-assistant');
  assert.ok(authIndex>=0&&routeIndex>authIndex);
  assert.equal(router.stack[routeIndex].route.stack[0].handle,require('../middleWare/aiRateLimit'));
});
