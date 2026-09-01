const router = require("express").Router();
const requireAuth = require("../middleWare/authMiddleware");
const {
  listCourses,
  getRecommendedCourses,
  getCourseFit,
  getCourse,
  upsertReview,
  addToPlan,
} = require("../Controllers/courseController");

router.use(requireAuth);
router.get("/recommended", getRecommendedCourses);
router.get("/:courseId/fit", getCourseFit);
router.get("/", listCourses);
router.get("/:courseId", getCourse);
router.put("/:courseId/review", upsertReview);
router.post("/:courseId/add-to-plan", addToPlan);

module.exports = router;
