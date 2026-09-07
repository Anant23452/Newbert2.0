const express = require("express");
const requireAuth = require("../middleWare/authMiddleware");
const { optionalAuth } = require("../middleWare/authMiddleware");
const {
  getMyProfile,
  updateMyProfile,
  updatePrivacy,
  syncPublicProfiles,
  getEffectiveSkills,
  getSkillEvidenceDetail,
  getPublicProfile,
} = require("../Controllers/profileController");

const router = express.Router();
const studentHome = require("../Controllers/studentHomeController");
router.get("/:userId/public", optionalAuth, getPublicProfile);
router.use(requireAuth);
router.get("/me", getMyProfile);
router.get("/today", studentHome.getToday);
router.get("/learning-progress", studentHome.getStudyProgress);
router.patch("/learning-progress", studentHome.updateStudyProgress);
router.put("/me", updateMyProfile);
router.patch("/privacy", updatePrivacy);
router.post("/sync", syncPublicProfiles);
router.get("/skills/effective", getEffectiveSkills);
router.get("/skills/:skill/evidence", getSkillEvidenceDetail);
module.exports = router;
