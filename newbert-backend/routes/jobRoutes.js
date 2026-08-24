const router = require("express").Router();
const { listJobs, getJob } = require("../Controllers/jobController");

router.get("/", listJobs);
router.get("/:id", getJob);
module.exports = router;
