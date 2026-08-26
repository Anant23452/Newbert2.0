const router = require("express").Router(); const { searchColleges } = require("../data/aktuColleges");
router.get("/search", (req, res) => res.json({ colleges: searchColleges(req.query.q).map(({ id, name, shortName, university, city }) => ({ id, name, shortName, university, city })) }));
module.exports = router;
