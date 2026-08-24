const router = require("express").Router();
const { listAlumni, getAlumni } = require("../Controllers/alumniController");

router.get("/", listAlumni);
router.get("/:id", getAlumni);
module.exports = router;
