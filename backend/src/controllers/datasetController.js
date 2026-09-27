const pool = require("../config/db");
const { datasetMetadataSchema } = require("../validators/datasetValidator");
const { processDataset } = require("../services/datasetService");

// ----------------------------------------
// Upload dataset
// ----------------------------------------
const uploadDataset = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "CSV file is required",
      });
    }

    const metadata = datasetMetadataSchema.parse({
      name: req.body.name,
      description: req.body.description || "",
    });

    const result = await processDataset({
      ownerId: req.user.userId,
      name: metadata.name,
      description: metadata.description,
      originalFilename: req.file.originalname,
      buffer: req.file.buffer,
    });

    return res.status(201).json({
      success: true,
      message: "Dataset uploaded and processed successfully",
      dataset: result,
    });
  } catch (error) {
    console.error("Dataset upload error:", error);

    return res.status(400).json({
      success: false,
      message:
        error.message || "Failed to upload dataset",
    });
  }
};

// ----------------------------------------
// Get user's datasets
// ----------------------------------------
const getDatasets = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         id,
         name,
         description,
         original_filename,
         row_count,
         column_count,
         status,
         error_message,
         created_at,
         updated_at
       FROM datasets
       WHERE owner_id = $1
       ORDER BY created_at DESC`,
      [req.user.userId]
    );

    return res.status(200).json({
      success: true,
      datasets: result.rows,
    });
  } catch (error) {
    console.error("Get datasets error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load datasets",
    });
  }
};

module.exports = {
  uploadDataset,
  getDatasets,
};