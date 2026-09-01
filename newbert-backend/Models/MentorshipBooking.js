const mongoose = require("mongoose");
const mentorshipBookingSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  alumniId: { type: mongoose.Schema.Types.ObjectId, ref: "Alumni", required: true, index: true },
  topicCategory: { type: String, required: true, trim: true, maxlength: 80 },
  topicDetails: { type: String, required: true, trim: true, minlength: 10, maxlength: 1500 },
  phone: { type: String, trim: true, maxlength: 20, default: null },
  requestedDateTime: { type: Date, required: true }, durationMinutes: { type: Number, enum: [30, 60], required: true },
  status: { type: String, enum: ["requested", "accepted", "rejected", "reschedule_requested", "cancelled", "completed"], default: "requested", index: true },
  alumniResponseNote: { type: String, trim: true, maxlength: 1000, default: null }, confirmedDateTime: { type: Date, default: null },
}, { timestamps: true });
mentorshipBookingSchema.index({ alumniId: 1, status: 1, createdAt: -1 });
mentorshipBookingSchema.index({ studentId: 1, createdAt: -1 });
module.exports = mongoose.model("MentorshipBooking", mentorshipBookingSchema);

