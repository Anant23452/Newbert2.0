const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {setup}=require('./helpers/alumniChatHarness');
const h=setup();let server,base;
async function request(path,body,token=h.token(),method=body===undefined?'GET':'POST'){if(!server){server=h.app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));base=`http://127.0.0.1:${server.address().port}/api/alumni-chat`;}const result=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:result.status,data:await result.json()};}
after(()=>server?.close());
let version=0;
async function post(path,value={}){const r=await request(path,{version,...value});if(r.data.session)version=r.data.session.version;return r;}
test('authenticated HTTP flow: start, resume, prefill, answers, skip, edit, AI failure, review and publication',async()=>{
 assert.equal((await request('/session',undefined,null)).status,401);
 assert.equal((await request('/session',undefined,'invalid-token')).status,401);
 assert.equal((await request('/start',{},h.token())).status,200);
 let r=await request('/session');assert.equal(r.data.session.version,0);assert.equal(r.data.session.prefill.name,'QA Senior');
 r=await post('/prefill',{use:true});assert.equal(r.data.session.answers.name,'QA Senior');
 const values={college:h.college,branch:'IT',graduationYear:2025,degree:'B.Tech',careerPath:'PLACEMENT',placement:{company:'QA Company',role:'Engineer',ctc:12},skillsAtSelection:[{name:'React'}],preparation:{startedIn:'YEAR_3',months:8},advice:'Start early and practise explaining your projects.',privacy:{'placement.ctc':'PRIVATE'}};
 for(const [questionId,value]of Object.entries(values)){r=await post('/answer',{questionId,value});assert.equal(r.status,200,JSON.stringify(r.data));}
 assert.equal((await post('/skip',{questionId:'name'})).status,400);
 r=await post('/skip',{questionId:'introduction'});assert.equal(r.status,200);assert(r.data.session.skippedQuestions.includes('introduction'));
 const before=r.data.session.answers.branch;
 assert.equal((await request('/answer',{version:0,questionId:'branch',value:'Civil'})).status,409);
 assert.equal((await request('/session')).data.session.answers.branch,before);
 r=await post('/back');assert.equal(r.status,200);
 r=await post('/extract',{questionId:'projects',rawAnswer:'I built a student planner.'});assert.equal(r.status,200);assert.match(r.data.notice,/original answer is saved/);assert.equal(r.data.session.rawAnswers.projects,'I built a student planner.');assert.equal(r.data.session.answers.projects,undefined);
 h.aiMode('success');r=await post('/extract',{questionId:'projects',rawAnswer:'I built a student planner.'});assert(r.data.session.pendingExtraction);assert.equal(r.data.session.answers.projects,undefined);
 assert.equal((await post('/publish',{confirm:true})).status,400);
 r=await post('/confirm-extraction',{value:[{name:'Planner',description:'Helps students plan lessons'}]});assert.equal(r.data.session.answers.projects[0].name,'Planner');
 r=await request('/review');assert.equal(r.status,200);assert.equal(r.data.preview.public.package,undefined);assert(r.data.session.canPublish);
 assert.equal((await post('/publish',{confirm:false})).status,400);
 r=await post('/publish',{confirm:true});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.session.status,'COMPLETED');
 assert.equal(h.alumni.size,1);assert.equal(h.alumni.get(h.userId).verified,false);
 const wall=await fetch(base.replace('/alumni-chat','/alumni')).then(r=>r.json());assert.equal(wall.alumni.length,1);assert.equal(wall.alumni[0].package,undefined);assert(!JSON.stringify(wall).includes('rawAnswers'));
 r=await request('/answer/branch',{version, value:'Computer Science'},h.token(),'PATCH');assert.equal(r.status,200);version=r.data.session.version;assert.equal(r.data.session.status,'IN_PROGRESS');
 r=await post('/publish',{confirm:true});assert.equal(r.status,200);assert.equal(h.alumni.size,1);
});
test('user identity comes from auth, not request data; private documents are isolated',async()=>{
 const other=await request('/start',{userId:h.userId},h.token(h.otherId));assert.equal(other.data.session.answers.name,undefined);assert.equal(other.data.session.prefill.name,'QA Other');
 const upload=await post('/documents',{source:'OFFER_LETTER',filename:'offer.pdf',base64:Buffer.from('%PDF-test document').toString('base64')});assert.equal(upload.status,201);assert.equal(upload.data.document.status,'PENDING');
 const list=await request('/documents');assert.equal(list.data.documents.length,1);assert.equal(list.data.documents[0].data,undefined);
 const otherList=await request('/documents',undefined,h.token(h.otherId));assert.equal(otherList.data.documents.length,0);
 assert.equal((await request('/documents/507f1f77bcf86cd799439041',undefined,h.token(h.otherId))).status,404);
 assert.equal((await post('/documents',{source:'OFFER_LETTER',filename:'bad.html',base64:Buffer.from('<html>').toString('base64')})).status,400);
});
test('restart is intentional and preserves the published record; hide removes the public story',async()=>{
 assert.equal((await post('/restart',{})).status,400);
 const r=await post('/restart',{confirm:true});assert.equal(r.status,200);assert.deepEqual(r.data.session.answers,{});assert.equal(h.alumni.size,1);
 assert.equal((await post('/hide',{confirm:true})).status,200);assert.equal(h.alumni.get(h.userId).publicationStatus,'HIDDEN');
 const wall=await fetch(base.replace('/alumni-chat','/alumni')).then(r=>r.json());assert.equal(wall.alumni.length,0);
});
