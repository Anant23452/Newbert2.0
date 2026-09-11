const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  key: { type: String, required: true, maxlength: 120 },
  completed: { type: Boolean, default: false },
  saved: { type: Boolean, default: false },
  lastViewedAt: Date,
  positionSeconds: { type: Number, default: 0, min: 0, max: 86400 },
  durationSeconds: { type: Number, default: 0, min: 0, max: 86400 },
  notes: { type: [{ id: String, text: String, seconds: Number, kind: String, resolved: Boolean, _id: false }], default: [] },
  reflection: { type: String, default: "", maxlength: 6000 },
  confidence: { type: String, enum: ["", "again", "good", "solid"], default: "" },
  reviewAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ userId: 1, key: 1 }, { unique: true });
module.exports = mongoose.model("StudyProgress", schema);
