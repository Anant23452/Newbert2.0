const router = require("express").Router();
const requireAuth = require("../middleWare/authMiddleware");
const { compareAlumni, getAlumniBenchmark, getClosestAlumni, getRecommendedAlumni, listAlumni, getAlumni } = require("../Controllers/alumniController");

router.get("/", listAlumni);
router.get("/recommended", requireAuth, getRecommendedAlumni);
router.get("/closest", requireAuth, getClosestAlumni);
router.get("/benchmark", requireAuth, getAlumniBenchmark);
router.get("/:id/compare", requireAuth, compareAlumni);
router.get("/:id", getAlumni);
module.exports = router;
