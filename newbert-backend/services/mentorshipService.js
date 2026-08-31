const ALUMNI_TRANSITIONS = Object.freeze({ requested: ["accepted", "rejected", "reschedule_requested"], reschedule_requested: ["accepted", "rejected", "reschedule_requested"], accepted: ["completed", "reschedule_requested"] });
const STUDENT_CANCELLABLE = new Set(["requested", "accepted", "reschedule_requested"]);
function canAlumniTransition(current, next) { return Boolean(ALUMNI_TRANSITIONS[current]?.includes(next)); }
function canStudentCancel(status) { return STUDENT_CANCELLABLE.has(status); }
function statusLabel(status) { return ({ requested: "Waiting for response", accepted: "Accepted", rejected: "Rejected", reschedule_requested: "Reschedule requested", cancelled: "Cancelled", completed: "Completed" })[status] || status; }
module.exports = { ALUMNI_TRANSITIONS, canAlumniTransition, canStudentCancel, statusLabel };

