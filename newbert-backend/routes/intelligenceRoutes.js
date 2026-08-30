const express = require("express");
const requireAuth = require("../middleWare/authMiddleware");
const { getMyReadiness } = require("../Controllers/intelligenceController");

const router = express.Router();
router.use(requireAuth);
router.get("/readiness", getMyReadiness);

module.exports = router;
