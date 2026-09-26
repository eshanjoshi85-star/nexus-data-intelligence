const express = require("express");
const multer = require("multer");

const authenticate = require("../middleware/authMiddleware");
const { uploadDataset } = require("../controllers/datasetController");

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

router.post(
  "/upload",
  authenticate,
  upload.single("file"),
  uploadDataset
);

module.exports = router;