const mongoose = require("mongoose");

const alumniSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  college: { type: String, required: true, trim: true, maxlength: 120 },
  batch: { type: Number, required: true, min: 2000, max: 2050 },
  company: { type: String, required: true, trim: true, maxlength: 120 },
  role: { type: String, required: true, trim: true, maxlength: 120 },
  outcomeType: { type: String, enum: ["placement", "gate"], default: "placement" },
  package: { type: Number, min: 0 },
  gateAIR: { type: Number, min: 1 },
  skills: { type: [String], default: [] },
  dsaSolved: { type: Number, min: 0 },
  projects: { type: Number, min: 0 },
  githubPublicRepos: { type: Number, min: 0 },
  cgpa: { type: Number, min: 0, max: 10 },
  avatarUrl: { type: String, trim: true },
  journey: { type: String, trim: true, maxlength: 5000 },
  verified: { type: Boolean, default: false },
}, { timestamps: true });

alumniSchema.index({ college: 1, verified: 1, createdAt: -1 });
module.exports = mongoose.model("Alumni", alumniSchema);
