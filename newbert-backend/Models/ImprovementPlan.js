const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true, trim: true, maxlength: 240 },
  description: { type: String, trim: true, maxlength: 500, default: "" },
  type: { type: String, enum: ["learn", "practice", "build", "assessment", "project", "leetcode", "github", "review", "interview"], required: true },
  estimatedMinutes: { type: Number, min: 5, max: 1440, required: true },
  order: { type: Number, min: 1, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
}, { _id: false });

const improvementPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  skillId: { type: String, required: true, trim: true, lowercase: true },
  skillName: { type: String, required: true, trim: true, maxlength: 120 },
  source: { type: String, enum: ["next_unlock"], default: "next_unlock" },
  reason: { type: mongoose.Schema.Types.Mixed, required: true },
  targetLevel: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "intermediate" },
  estimatedDays: { min: { type: Number, default: 3 }, max: { type: Number, default: 7 } },
  status: { type: String, enum: ["not_started", "in_progress", "evidence_submitted", "verified"], default: "not_started", index: true },
  tasks: { type: [taskSchema], default: [] },
  evidence: { type: [mongoose.Schema.Types.Mixed], default: [] },
  progressPercent: { type: Number, min: 0, max: 100, default: 0 },
  roadmapPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", default: null },
  addedToRoadmapAt: { type: Date, default: null },
  lastReadiness: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

improvementPlanSchema.index({ userId: 1, skillId: 1 }, { unique: true });

module.exports = mongoose.model("ImprovementPlan", improvementPlanSchema);
