const express = require("express");
const requireAuth = require("../middleWare/authMiddleware");
const { getMyProfile, updateMyProfile } = require("../Controllers/profileController");

const router = express.Router();
router.use(requireAuth);
router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);
module.exports = router;
