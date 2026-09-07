const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  key: { type: String, required: true, maxlength: 120 },
  completed: { type: Boolean, default: false },
  saved: { type: Boolean, default: false },
  lastViewedAt: Date,
}, { timestamps: true });
schema.index({ userId: 1, key: 1 }, { unique: true });
module.exports = mongoose.model("StudyProgress", schema);
