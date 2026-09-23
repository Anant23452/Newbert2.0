const mongoose=require('mongoose');
const schema=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},source:{type:String,required:true},filename:{type:String,required:true},mimeType:{type:String,required:true},size:{type:Number,required:true},data:{type:Buffer,required:true,select:false},status:{type:String,enum:['PENDING','VERIFIED','REJECTED'],default:'PENDING'},reviewedAt:Date},{timestamps:true});
module.exports=mongoose.model('AlumniVerificationDocument',schema);
