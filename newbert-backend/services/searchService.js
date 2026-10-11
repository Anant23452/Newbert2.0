function searchPattern(value) {
  if(typeof value!=='string')return null;
  const q=value.trim().slice(0,80);
  if(q.length<2)return null;
  return new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i');
}
module.exports={searchPattern};
