const mongoose = require("mongoose");

const savedJobSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  status: { type: String, enum: ["saved", "planning", "applied", "interview", "rejected", "offer"], default: "saved" },
}, { timestamps: true });

savedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });
module.exports = mongoose.model("SavedJob", savedJobSchema);
// /add save job 
