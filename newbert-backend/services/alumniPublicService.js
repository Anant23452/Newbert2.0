function dummyDataEnabled() { return String(process.env.ALLOW_DUMMY_ALUMNI || "true").toLowerCase() !== "false"; }
function publicAlumniQuery(extra = {}) { return { verified: true, "privacy.profile": { $ne: false }, ...(dummyDataEnabled() ? {} : { isDummyData: { $ne: true } }), ...extra }; }
function serializePublicAlumni(record) {
  const alumni = { ...record }; delete alumni.userId; delete alumni.dummyKey; delete alumni.__v;
  const privacy = { academics: true, preparation: true, courses: true, advice: true, mentorship: true, ...(alumni.privacy || {}) };
  if (!privacy.academics) { delete alumni.academics; delete alumni.cgpa; }
  if (!privacy.preparation) { delete alumni.placementPreparation; delete alumni.gatePreparation; delete alumni.dsa; delete alumni.dsaSolved; delete alumni.csFundamentals; delete alumni.journey; delete alumni.preparationMonths; delete alumni.projectsDetail; delete alumni.interviewExperience; }
  if (!privacy.courses) delete alumni.courses;
  if (!privacy.advice) { delete alumni.advice; delete alumni.adviceDetails; }
  if (!privacy.mentorship) { alumni.mentorshipEnabled = false; delete alumni.availableTopics; }
  return alumni;
}
module.exports = { dummyDataEnabled, publicAlumniQuery, serializePublicAlumni };

