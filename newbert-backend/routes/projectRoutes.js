const express = require("express");
const requireAuth = require("../middleWare/authMiddleware");
const {
  getGithubRepositories,
  analyzeGithubRepository,
  addGithubProject,
  toggleFeaturedProject,
  refreshProjectAnalysis,
  confirmProjectTechnologies,
  deleteProject,
} = require("../Controllers/projectController");

const router = express.Router();
router.use(requireAuth);

router.get("/github/repos", getGithubRepositories);
router.post("/github/analyze", analyzeGithubRepository);
router.post("/github/add", addGithubProject);
router.patch("/:id/featured", toggleFeaturedProject);
router.post("/:id/refresh", refreshProjectAnalysis);
router.post("/:id/confirm-technologies", confirmProjectTechnologies);
router.delete("/:id", deleteProject);

module.exports = router;
