const express = require("express");
const multer = require("multer");

const authenticate = require("../middleware/authMiddleware");

const {
  uploadDataset,
  getDatasets,
} = require("../controllers/datasetController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "text/csv" ||
      file.originalname.toLowerCase().endsWith(".csv")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

// GET all datasets owned by logged-in user
router.get(
  "/",
  authenticate,
  getDatasets
);

// Upload CSV dataset
router.post(
  "/upload",
  authenticate,
  upload.single("file"),
  uploadDataset
);

module.exports = router;