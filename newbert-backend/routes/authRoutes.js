const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const requireAuth = require("../middleWare/authMiddleware");

function publicUser(user) { return { id: user._id, name: user.name, email: user.email }; }
function createToken(user) { return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" }); }

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password || password.length < 8) return res.status(400).json({ message: "Name, email, and a password of at least 8 characters are required." });
    const normalizedEmail = email.trim().toLowerCase();
    if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ message: "An account with this email already exists." });
    const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12) });
    return res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) { return next(error); }
});

router.post("/login", async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email?.trim().toLowerCase() }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(req.body.password || "", user.passwordHash))) return res.status(401).json({ message: "Invalid email or password." });
    return res.json({ token: createToken(user), user: publicUser(user) });
  } catch (error) { return next(error); }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.json({ user: publicUser(user) });
  } catch (error) { return next(error); }
});

module.exports = router;
