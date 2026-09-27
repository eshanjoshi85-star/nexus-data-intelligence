const pool = require("../config/db");

const {
  getDatasetRows,
} = require("../services/dataExplorerService");

const getExplorerData = async (req, res) => {
  try {
    const { datasetId } = req.params;

    const datasetResult = await pool.query(
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

    const search =
      typeof req.query.search === "string"
        ? req.query.search
        : "";

    const page =
      Number.parseInt(req.query.page, 10) || 1;

    const limit =
      Number.parseInt(req.query.limit, 10) || 10;

    let filters = {};

    if (req.query.filters) {
      try {
        filters = JSON.parse(req.query.filters);

        if (
          filters === null ||
          typeof filters !== "object" ||
          Array.isArray(filters)
        ) {
          throw new Error();
        }
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid filters format",
        });
      }
    }

    const result = await getDatasetRows({
      datasetId,
      search,
      filters,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      dataset,
      ...result,
    });
  } catch (error) {
    console.error("Explorer error:", error);

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to load dataset rows",
    });
  }
};

module.exports = {
  getExplorerData,
};