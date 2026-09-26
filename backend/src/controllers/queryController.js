const { z } = require("zod");

const pool = require("../config/db");
const { executeQuery } = require("../services/queryService");

const querySchema = z.object({
  filters: z
    .object({
      numeric: z.array(z.object({
        column: z.string(),
        operator: z.string(),
        value: z.union([z.string(), z.number()]),
      })).optional(),

      category: z.array(z.object({
        column: z.string(),
        operator: z.string(),
        values: z.array(z.string()),
      })).optional(),

      date: z.object({
        column: z.string(),
        from: z.string().optional(),
        to: z.string().optional(),
      }).optional(),
    })
    .optional()
    .default({}),

  groupBy: z.string().optional(),

  metric: z.string(),

  aggregation: z
    .enum(["SUM", "AVG", "COUNT", "MIN", "MAX"])
    .default("SUM"),
});

const queryDataset = async (req, res) => {
  try {
    const { datasetId } = req.params;

    // Verify that the dataset belongs to the logged-in user
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
        message: "Dataset is not ready for querying",
      });
    }

    // Validate request body
    const validation = querySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const result = await executeQuery({
      datasetId,
      ...validation.data,
    });

    return res.status(200).json({
      success: true,
      dataset: {
        id: dataset.id,
        name: dataset.name,
      },
      query: result,
    });
  } catch (error) {
    console.error("Dataset query error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to query dataset",
    });
  }
};

module.exports = {
  queryDataset,
};