const express = require("express");

const authenticate = require("../middleware/authMiddleware");
const { getDashboard } = require("../controllers/dashboardController");

const router = express.Router();

router.post("/:datasetId/dashboard", authenticate, getDashboard);

module.exports = router;