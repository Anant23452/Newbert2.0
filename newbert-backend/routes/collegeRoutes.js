const router = require("express").Router(); const requireAuth = require("../middleWare/authMiddleware"); const { list, search, requestCollege } = require("../Controllers/collegeController");
router.get("/", list); router.get("/search", search); router.post("/request", requireAuth, requestCollege);
module.exports = router;
