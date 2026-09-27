const pool = require("../config/db");

const {
  getInsights,
} = require("../services/insightService");

const getDatasetInsights = async (
  req,
  res
) => {
  try {
    const { datasetId } =
      req.params;

    const datasetResult =
      await pool.query(
        `SELECT
           id,
           name,
           status
         FROM datasets
         WHERE id = $1
           AND owner_id = $2`,
        [
          datasetId,
          req.user.userId,
        ]
      );

    if (
      datasetResult.rows.length ===
      0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Dataset not found",
      });
    }

    const dataset =
      datasetResult.rows[0];

    if (
      dataset.status !==
      "READY"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Dataset is not ready",
      });
    }

    let filters = {};

    if (req.body?.filters) {
      filters =
        req.body.filters;
    }

    const result =
      await getInsights({
        datasetId,
        filters,
      });

    return res.status(200).json({
      success: true,
      dataset,
      ...result,
    });
  } catch (error) {
    console.error(
      "Insight error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to generate insights",
    });
  }
};

module.exports = {
  getDatasetInsights,
};