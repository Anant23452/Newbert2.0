const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 140 },
  company: { type: String, required: true, trim: true, maxlength: 120 },
  companySlug: { type: String, trim: true, maxlength: 140 },
  roleCategory: { type: String, trim: true, maxlength: 80 },
  location: { type: mongoose.Schema.Types.Mixed, default: null },
  employmentType: { type: String, enum: ["internship", "full-time", "part-time", "contract"], default: "full-time" },
  experienceLevel: { type: String, enum: ["intern", "entry-level", "junior", "mid", "senior", "unspecified"], default: "unspecified" },
  salary: { type: mongoose.Schema.Types.Mixed, default: null },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  skills: { type: [String], default: [] },
  requirements: { type: mongoose.Schema.Types.Mixed, default: () => ({ requiredSkills: [], preferredSkills: [], csFundamentals: [], minimumCgpa: null, allowedBranches: [], graduationYears: [], experienceYears: null }) },
  responsibilities: { type: [String], default: [] },
  application: { type: mongoose.Schema.Types.Mixed, default: null },
  applyUrl: { type: String, required: true, trim: true },
  source: { type: mongoose.Schema.Types.Mixed, default: null },
  verification: { type: mongoose.Schema.Types.Mixed, default: () => ({ status: "pending", sourceType: "unknown", verifiedAt: null, lastCheckedAt: null }) },
  deadline: Date,
  postedAt: Date,
  expiresAt: Date,
  jdAnalysis: { type: mongoose.Schema.Types.Mixed, default: null },
  active: { type: Boolean, default: true },
}, { timestamps: true });

jobSchema.index({ active: 1, createdAt: -1 });
module.exports = mongoose.model("Job", jobSchema);
