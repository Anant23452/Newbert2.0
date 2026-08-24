const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 140 },
  company: { type: String, required: true, trim: true, maxlength: 120 },
  location: { type: String, trim: true, maxlength: 120 },
  employmentType: { type: String, enum: ["internship", "full-time", "part-time", "contract"], default: "full-time" },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  skills: { type: [String], default: [] },
  applyUrl: { type: String, required: true, trim: true },
  deadline: Date,
  active: { type: Boolean, default: true },
}, { timestamps: true });

jobSchema.index({ active: 1, createdAt: -1 });
module.exports = mongoose.model("Job", jobSchema);
