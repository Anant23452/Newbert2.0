const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, password });

  if (!user) {
    return res.status(400).json({ msg: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user._id }, "secretkey");

  res.json({
    token,
    user: {
      name: user.name,
      email: user.email,
    },
  });
});

module.exports = router;