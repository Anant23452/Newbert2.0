import test from 'node:test';
import assert from 'node:assert/strict';
import {createActivityRefresher,changesStudentActivity} from './activityRefresh.js';

test('focus, route and timer events share one read and a cooldown',async()=>{
 let reads=0,syncs=0,time=1000000,release;
 const waiting=new Promise(resolve=>{release=resolve;});
 const refresh=createActivityRefresher({getToken:()=> 'account',now:()=>time,readProfile:async()=>{reads++;await waiting;return {onboardingCompleted:true,syncNeeded:['github']};},syncProfile:async()=>{syncs++;}});
 const a=refresh(),b=refresh();release();await Promise.all([a,b]);
 assert.equal(reads,1);assert.equal(syncs,1);
 await refresh();assert.equal(reads,1);
 time+=60000;await refresh();assert.equal(reads,2);assert.equal(syncs,1);
 time+=60000;await refresh();assert.equal(syncs,2);
});
test('signed-out or hidden pages do not poll and old accounts cannot trigger a new sync',async()=>{
 let token=null,shown=true,reads=0,syncs=0,release;
 const waiting=new Promise(resolve=>{release=resolve;});
 const refresh=createActivityRefresher({getToken:()=>token,visible:()=>shown,readProfile:async()=>{reads++;await waiting;return {onboardingCompleted:true,syncNeeded:['leetcode']};},syncProfile:async()=>{syncs++;}});
 await refresh();assert.equal(reads,0);
 token='first';shown=false;await refresh();assert.equal(reads,0);
 shown=true;const pending=refresh();token='second';release();await pending;assert.equal(syncs,0);
 await refresh();assert.equal(syncs,1);
});
test('mutations during a read queue a fresh snapshot without concurrent requests',async()=>{
 let reads=0,release;
 const waiting=new Promise(resolve=>{release=resolve;});
 const refresh=createActivityRefresher({getToken:()=> 'account',readProfile:async()=>{reads++;if(reads===1)await waiting;return {onboardingCompleted:true,syncNeeded:[]};},syncProfile:async()=>{throw new Error('not needed');}});
 const pending=refresh();void refresh({changed:true});void refresh({changed:true});release();await pending;
 await Promise.resolve();assert.equal(reads,2);
});
test('network failures retain the coordinator and retry after the read cooldown',async()=>{
 let reads=0,time=0;
 const refresh=createActivityRefresher({getToken:()=> 'account',now:()=>time,readProfile:async()=>{reads++;throw new Error('offline');},syncProfile:async()=>{}});
 assert.equal(await refresh(),null);await refresh();assert.equal(reads,1);
 time=30000;await refresh();assert.equal(reads,2);
});
test('only successful activity mutations should trigger profile refresh; reads and AI do not loop',()=>{
 for(const url of ['/projects/one','/improvement-plans/p/tasks/t','/profiles/learning-progress','/profiles/privacy'])assert.equal(changesStudentActivity({method:'patch',url}),true);
 for(const config of [{method:'get',url:'/profiles/me'},{method:'post',url:'/profiles/sync'},{method:'post',url:'/profiles/study-assistant'},{method:'post',url:'/auth/login'}])assert.equal(changesStudentActivity(config),false);
});
