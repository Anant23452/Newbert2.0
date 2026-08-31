const Alumni = require("../Models/Alumni");
const MentorshipBooking = require("../Models/MentorshipBooking");
const { canAlumniTransition, canStudentCancel, statusLabel } = require("../services/mentorshipService");
function serializeBooking(booking) { const item = booking.toObject ? booking.toObject() : booking; return { ...item, statusLabel: statusLabel(item.status) }; }
exports.createRequest = async (req, res, next) => { try {
  const alumni = await Alumni.findOne({ _id: req.body.alumniId, verified: true, mentorshipEnabled: true });
  if (!alumni) return res.status(404).json({ message: "This alumni is not accepting mentorship requests." });
  if (alumni.userId && String(alumni.userId) === String(req.auth.id)) return res.status(400).json({ message: "You cannot request mentorship from your own alumni profile." });
  const topicCategory = String(req.body.topicCategory || "").trim();
  if (!topicCategory || (alumni.availableTopics.length && !alumni.availableTopics.includes(topicCategory))) return res.status(400).json({ message: "Choose an available mentorship topic." });
  const requestedDateTime = new Date(req.body.requestedDateTime); if (Number.isNaN(requestedDateTime.getTime())) return res.status(400).json({ message: "Choose a valid preferred date and time." });
  const durationMinutes = Number(req.body.durationMinutes); if (![30, 60].includes(durationMinutes)) return res.status(400).json({ message: "Choose a 30 or 60 minute session." });
  const booking = await MentorshipBooking.create({ studentId: req.auth.id, alumniId: alumni._id, topicCategory, topicDetails: req.body.topicDetails, requestedDateTime, durationMinutes });
  return res.status(201).json({ message: "Mentorship request sent.", booking: serializeBooking(booking) });
} catch (error) { return next(error); } };
exports.listMyRequests = async (req, res, next) => { try { const bookings = await MentorshipBooking.find({ studentId: req.auth.id }).populate("alumniId", "name avatarUrl college").sort({ createdAt: -1 }); return res.json({ requests: bookings.map(serializeBooking) }); } catch (error) { return next(error); } };
exports.listReceivedRequests = async (req, res, next) => { try { const alumni = await Alumni.findOne({ userId: req.auth.id }).select("name"); if (!alumni) return res.json({ alumniProfile: false, requests: [] }); const bookings = await MentorshipBooking.find({ alumniId: alumni._id }).populate("studentId", "name avatarUrl").sort({ createdAt: -1 }); return res.json({ alumniProfile: true, alumni: { id: alumni._id, name: alumni.name }, requests: bookings.map(serializeBooking) }); } catch (error) { return next(error); } };
exports.updateReceivedRequest = async (req, res, next) => { try {
  const alumni = await Alumni.findOne({ userId: req.auth.id }).select("_id"); if (!alumni) return res.status(403).json({ message: "Only the receiving alumni can update this request." });
  const booking = await MentorshipBooking.findOne({ _id: req.params.id, alumniId: alumni._id }); if (!booking) return res.status(404).json({ message: "Mentorship request not found." });
  const nextStatus = String(req.body.status || ""); if (!canAlumniTransition(booking.status, nextStatus)) return res.status(400).json({ message: `Cannot change ${booking.status} to ${nextStatus}.` });
  booking.status = nextStatus; booking.alumniResponseNote = req.body.alumniResponseNote || null;
  if (nextStatus === "accepted") booking.confirmedDateTime = req.body.confirmedDateTime ? new Date(req.body.confirmedDateTime) : booking.requestedDateTime;
  if (nextStatus === "reschedule_requested") { if (!req.body.confirmedDateTime) return res.status(400).json({ message: "Provide the proposed new meeting time." }); booking.confirmedDateTime = new Date(req.body.confirmedDateTime); }
  await booking.save(); return res.json({ message: "Mentorship request updated.", booking: serializeBooking(booking) });
} catch (error) { return next(error); } };
exports.cancelMyRequest = async (req, res, next) => { try { const booking = await MentorshipBooking.findOne({ _id: req.params.id, studentId: req.auth.id }); if (!booking) return res.status(404).json({ message: "Mentorship request not found." }); if (!canStudentCancel(booking.status)) return res.status(400).json({ message: `A ${booking.status} request cannot be cancelled.` }); booking.status = "cancelled"; await booking.save(); return res.json({ message: "Mentorship request cancelled.", booking: serializeBooking(booking) }); } catch (error) { return next(error); } };

