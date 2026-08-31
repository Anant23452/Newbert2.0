const express = require("express");
const requireAuth = require("../middleWare/authMiddleware");
const { getMyReadiness, getMySkillEvidence } = require("../Controllers/intelligenceController");

const router = express.Router();
router.use(requireAuth);
router.get("/readiness", getMyReadiness);
router.get("/skill-evidence", getMySkillEvidence);

module.exports = router;
