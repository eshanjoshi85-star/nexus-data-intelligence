const pool = require("../config/db");
const { getDashboardData } = require("../services/dashboardService");

const getDashboard = async (req, res) => {
  try {
    const { datasetId } = req.params;

    // Verify dataset ownership
    const datasetResult = await pool.query(
      `SELECT id, name, status
       FROM datasets
       WHERE id = $1
       AND owner_id = $2`,
      [datasetId, req.user.userId]
    );

    if (datasetResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Dataset not found",
      });
    }

    const dataset = datasetResult.rows[0];

    if (dataset.status !== "READY") {
      return res.status(409).json({
        success: false,
        message: "Dataset is not ready",
      });
    }

    const result = await getDashboardData({
      datasetId,
      filters: req.body?.filters || {},
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Dashboard error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to load dashboard",
    });
  }
};

module.exports = {
  getDashboard,
};