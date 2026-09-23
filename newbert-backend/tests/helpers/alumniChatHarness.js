// In-memory development/test harness. Never imported by the production server.
const {mock}=require('node:test');
const express=require('express');
const jwt=require('jsonwebtoken');
const Session=require('../../Models/AlumniChatSession');
const GuestSession=require('../../Models/AlumniGuestSession');
const Alumni=require('../../Models/Alumni');
const User=require('../../Models/User');
const Profile=require('../../Models/Profile');
const Document=require('../../Models/AlumniVerificationDocument');
const collegeService=require('../../services/collegeService');
const ai=require('../../services/alumniAIService');
const userId='507f1f77bcf86cd799439022',otherId='507f1f77bcf86cd799439023';
const college={_id:'507f1f77bcf86cd799439011',collegeId:'qa-college',name:'QA College (test only)'};
function clone(value){return value===undefined?undefined:structuredClone(value);}
function setup(){
 const sessions=new Map(),guestSessions=new Map(),alumni=new Map(),documents=new Map();let aiMode='failure';
 process.env.JWT_SECRET='local-onboarding-test-secret-not-for-production';
 function doc(value){const item=clone(value);return Object.assign(item,{markModified(){},toObject(){const out={};for(const[k,v]of Object.entries(this))if(typeof v!=='function')out[k]=clone(v);return out;},async save(){const existing=sessions.get(String(this.userId));if(existing&&existing.__v!==this.__v){const e=new Error('conflict');e.name='VersionError';throw e;}this.__v=(this.__v||0)+1;sessions.set(String(this.userId),this.toObject());return this;}});}
 mock.method(Session,'findOne',async q=>sessions.has(String(q.userId))?doc(sessions.get(String(q.userId))):null);
 mock.method(Session,'create',async value=>{const key=String(value.userId);if(sessions.has(key)){const e=new Error('duplicate');e.code=11000;throw e;}const stored={...clone(value),_id:'session-'+key,__v:0};sessions.set(key,stored);return doc(stored);});
 function guestDoc(value){const item=clone(value);return Object.assign(item,{markModified(){},toObject(){const out={};for(const[k,v]of Object.entries(this))if(typeof v!=='function')out[k]=clone(v);return out;},async save(){const existing=guestSessions.get(this.tokenHash);if(existing&&existing.__v!==this.__v){const e=new Error('conflict');e.name='VersionError';throw e;}this.__v=(this.__v||0)+1;guestSessions.set(this.tokenHash,this.toObject());return this;}});}
 mock.method(GuestSession,'findOne',async q=>guestSessions.has(q.tokenHash)?guestDoc(guestSessions.get(q.tokenHash)):null);
 mock.method(GuestSession,'create',async value=>{const stored={...clone(value),_id:`507f1f77bcf86cd7994390${String(guestSessions.size+32).padStart(2,'0')}`,__v:0};guestSessions.set(value.tokenHash,stored);return guestDoc(stored);});
 mock.method(User,'findById',id=>({lean:async()=>({_id:id,name:id===userId?'QA Senior':'QA Other'})}));
 mock.method(Profile,'findOne',()=>({lean:async()=>null}));
 mock.method(collegeService,'findCollegeByIdentifier',async id=>id===college.collegeId||id===college._id?college:null);
 mock.method(Alumni,'findOne',q=>({lean:async()=>[...alumni.values()].find(a=>q.userId?String(a.userId)===String(q.userId):q.guestSessionId?String(a.guestSessionId)===String(q.guestSessionId):String(a._id)===String(q._id))||null}));
 mock.method(Alumni,'findOneAndUpdate',async(q,update)=>{const key=String(q.userId||q.guestSessionId);const existing=alumni.get(key);const item={...existing,...clone(update.$set),...(q.userId?{userId:q.userId}:{guestSessionId:q.guestSessionId}),_id:existing?._id||'507f1f77bcf86cd799439031',createdAt:existing?.createdAt||new Date()};await new Alumni(item).validate();alumni.set(key,item);return item;});
 mock.method(Alumni,'updateOne',async(q,update)=>{const a=alumni.get(String(q.userId||q.guestSessionId));if(a)Object.assign(a,clone(update.$set));return {modifiedCount:a?1:0};});
 mock.method(ai,'extractAnswer',async()=>{if(aiMode==='failure')throw new Error('simulated provider outage');return {answer:[{name:'AI suggestion',description:'Awaiting owner confirmation'}],estimatedFields:[]};});
 mock.method(Document,'countDocuments',async q=>[...documents.values()].filter(d=>d.userId===q.userId).length);
 mock.method(Document,'create',async value=>{const item={...value,_id:'507f1f77bcf86cd799439041',status:'PENDING'};documents.set(item._id,item);return item;});
 mock.method(Document,'find',q=>({select:()=>({lean:async()=>[...documents.values()].filter(d=>d.userId===q.userId).map(({data,...rest})=>({...rest,size:data.length}))})}));
 mock.method(Document,'findOne',q=>({select:async()=>{const d=documents.get(q._id);return d?.userId===q.userId?d:null;}}));
 const app=express();app.use((req,res,next)=>{res.set('Access-Control-Allow-Origin','http://127.0.0.1:5184');res.set('Access-Control-Allow-Headers','Content-Type,Authorization,X-Alumni-Guest-Token');res.set('Access-Control-Allow-Methods','GET,POST,PATCH,OPTIONS');if(req.method==='OPTIONS')return res.sendStatus(204);next();});app.use(express.json({limit:'3mb'}));app.use('/api/alumni-chat',require('../../routes/alumniChatRoutes'));app.use('/api/alumni-guest',require('../../routes/alumniGuestRoutes'));
 app.get('/api/colleges/search',(req,res)=>res.json({colleges:[college]}));
 app.get('/api/alumni',(req,res)=>res.json({alumni:[...alumni.values()].filter(a=>a.publicationStatus==='PUBLISHED').map(a=>require('../../services/alumniPublicService').serializePublicAlumni(a))}));
 app.get('/api/alumni/:id',(req,res)=>{const a=[...alumni.values()].find(a=>a._id===req.params.id&&a.publicationStatus==='PUBLISHED');res.status(a?200:404).json(a?{alumni:require('../../services/alumniPublicService').serializePublicAlumni(a)}:{message:'Not found'});});
 app.use((e,req,res,next)=>res.status(e.status||500).json({message:e.message}));
 return {app,sessions,guestSessions,alumni,documents,college,userId,otherId,token:id=>jwt.sign({id:id||userId},process.env.JWT_SECRET,{expiresIn:'2h'}),aiMode:value=>{aiMode=value;}};
}
module.exports={setup,userId,otherId,college};
