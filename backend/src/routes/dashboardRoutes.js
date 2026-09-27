const express = require("express");
console.log("✅ dashboardRoutes.js loaded");
const authenticate = require("../middleware/authMiddleware");
const { getDashboard } = require("../controllers/dashboardController");

const router = express.Router();

router.post("/:datasetId/dashboard", authenticate, getDashboard);

module.exports = router;