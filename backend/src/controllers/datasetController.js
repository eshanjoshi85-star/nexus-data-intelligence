const { datasetMetadataSchema } = require("../validators/datasetValidator");
const { processDataset } = require("../services/datasetService");

const uploadDataset = async (req, res) => {
  try {
    // Check that a file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "CSV file is required",
      });
    }

    // Validate dataset metadata
    const validation = datasetMetadataSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid dataset metadata",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { name, description } = validation.data;

    // Process and store dataset
    const result = await processDataset({
      ownerId: req.user.userId,
      name,
      description,
      originalFilename: req.file.originalname,
      buffer: req.file.buffer,
    });

    return res.status(201).json({
      success: true,
      message: "Dataset uploaded successfully",
      dataset: result,
    });
  } catch (error) {
    console.error("Dataset upload error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process dataset",
    });
  }
};

module.exports = {
  uploadDataset,
};