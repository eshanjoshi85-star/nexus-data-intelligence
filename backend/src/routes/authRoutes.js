const express = require("express");

const {
  register,
  login,
  getMe,
  googleAuth,
  googleCallback,
} = require("../controllers/authController");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

// Email/password authentication
router.post("/register", register);
router.post("/login", login);

// Google OAuth
router.get("/google", googleAuth);
router.get("/google/callback", googleCallback);

// Current user
router.get("/me", authenticate, getMe);

module.exports = router;