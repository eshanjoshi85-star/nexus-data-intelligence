const express = require("express");

const authenticate = require("../middleware/authMiddleware");
const { queryDataset } = require("../controllers/queryController");

const router = express.Router();



router.post("/:datasetId/query", authenticate, queryDataset);

module.exports = router;