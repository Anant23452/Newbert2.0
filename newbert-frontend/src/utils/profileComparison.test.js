import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePublicProfile } from './profileComparison.js';
const own={userId:'me',skills:[{name:'JavaScript'},{name:'React.js'},{name:'SQL'}],githubStats:{publicRepos:4},leetcodeStats:{totalSolved:0},projectDetails:[]};
test('aliases match and public listings do not become proficiency grades',()=>{
 const result=comparePublicProfile(own,{userId:'other',skills:['JS','React','Python'],leetcode:{connected:true,totalSolved:10}});
 assert.equal(result.shared.length,2); assert.deepEqual(result.explore,['Python']); assert.deepEqual(result.unique,['SQL']); assert.equal(result.overlap,67); assert.equal(result.metrics[0].delta,10);
});
test('hidden fields remain unavailable rather than zero',()=>{
 const result=comparePublicProfile(own,{userId:'other'});
 assert.equal(result.overlap,null); assert.equal(result.visibleSkills,false); assert.ok(result.metrics.every(row=>row.delta===null)); assert.deepEqual(result.unique,[]);
});
test('private profiles and self comparisons cannot be compared',()=>{
 assert.equal(comparePublicProfile(own,{userId:'other',private:true,skills:['Secret']}),null);
 assert.equal(comparePublicProfile(own,{userId:'me'}),null);
});
test('featured project counts compare the same public subset and ignore claimed totals',()=>{
 const result=comparePublicProfile({...own,projects:99,projectDetails:[{isFeatured:true,visibility:'private'},{isFeatured:true,visibility:'public'},{isFeatured:false}]},{userId:'other',projects:{count:2}});
 assert.equal(result.metrics[2].you,1); assert.equal(result.metrics[2].delta,1);
});
