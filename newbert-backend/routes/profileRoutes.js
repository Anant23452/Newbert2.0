const express = require("express");
const requireAuth = require("../middleWare/authMiddleware");
const { getMyProfile, updateMyProfile, syncPublicProfiles, getSeniorMatch, getPublicProfile } = require("../Controllers/profileController");

const router = express.Router();
router.get("/:userId/public", getPublicProfile);
router.use(requireAuth);
router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);
router.post("/sync", syncPublicProfiles);
router.get("/senior-match", getSeniorMatch);
module.exports = router;
