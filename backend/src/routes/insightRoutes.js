const express = require("express");

const authenticate = require("../middleware/authMiddleware");

const {
  getDatasetInsights,
} = require("../controllers/insightController");

const router =
  express.Router();

router.post(
  "/:datasetId/insights",
  authenticate,
  getDatasetInsights
);

module.exports = router;