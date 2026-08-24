const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  passwordHash: { type: String, select: false },
  googleId: { type: String, unique: true, sparse: true, select: false },
  avatarUrl: { type: String, trim: true },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
