const mongoose = require("mongoose");

const targetSchema = new mongoose.Schema({
  type: { type: String, required: true, trim: true, maxlength: 60 },
  role: { type: String, required: true, trim: true, maxlength: 120 },
  company: { type: String, trim: true, maxlength: 120, default: null },
  deadline: { type: Date, default: null },
  weeklyHours: { type: Number, required: true, min: 2, max: 60, default: 10 },
  customGoal: { type: String, trim: true, maxlength: 240, default: null },
}, { _id: false });

const taskSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true, trim: true, maxlength: 240 },
  description: { type: String, trim: true, maxlength: 500, default: "" },
  type: { type: String, enum: ["daily", "weekly"], default: "weekly" },
  phaseId: { type: String, required: true },
  scheduledWeek: { type: Number, min: 1, required: true },
  scheduledDate: { type: Date, default: null },
  verifiable: { type: Boolean, default: false },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  archived: { type: Boolean, default: false },
}, { _id: false });

const planSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  target: { type: targetSchema, required: true },
  seniorMatch: { type: mongoose.Schema.Types.Mixed, default: null },
  readiness: { type: mongoose.Schema.Types.Mixed, required: true },
  gaps: { type: [mongoose.Schema.Types.Mixed], default: [] },
  phases: { type: [mongoose.Schema.Types.Mixed], default: [] },
  tasks: { type: [taskSchema], default: [] },
  timeline: { type: mongoose.Schema.Types.Mixed, required: true },
  progress: { type: mongoose.Schema.Types.Mixed, required: true },
  profileSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  generationVersion: { type: Number, default: 1 },
  lastCalculatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model("Plan", planSchema);
