const express = require("express");

const authenticate = require("../middleware/authMiddleware");

const {
  getExplorerData,
} = require("../controllers/dataExplorerController");

const router = express.Router();

router.get(
  "/:datasetId/explorer",
  authenticate,
  getExplorerData
);

module.exports = router;