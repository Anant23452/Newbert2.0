const express = require("express");
const requireAuth = require("../middleWare/authMiddleware");
const { getMyProfile, updateMyProfile, syncPublicProfiles, getSeniorMatch } = require("../Controllers/profileController");

const router = express.Router();
router.use(requireAuth);
router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);
router.post("/sync", syncPublicProfiles);
router.get("/senior-match", getSeniorMatch);
module.exports = router;
