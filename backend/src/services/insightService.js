const pool = require("../config/db");

// =====================================================
// GET DATASET COLUMNS
// =====================================================

const getDatasetColumns = async (datasetId) => {
  const result = await pool.query(
    `SELECT
       column_name,
       display_name,
       data_type,
       ordinal_position
     FROM dataset_columns
     WHERE dataset_id = $1
     ORDER BY ordinal_position`,
    [datasetId]
  );

  return result.rows;
};

// =====================================================
// FIND COLUMN BY PATTERN
// =====================================================

const findColumn = (columns, patterns) => {
  return columns.find((column) =>
    patterns.some((pattern) =>
      column.column_name
        .toLowerCase()
        .includes(pattern)
    )
  );
};

// =====================================================
// BUILD FILTER WHERE CLAUSE
// =====================================================

const buildWhereClause = (
  datasetId,
  filters = {}
) => {
  const conditions = [
    "dataset_id = $1",
  ];

  const values = [datasetId];

  let parameterIndex = 2;

  for (const [
    columnName,
    filterValue,
  ] of Object.entries(filters)) {
    if (
      filterValue === undefined ||
      filterValue === null ||
      String(filterValue).trim() === ""
    ) {
      continue;
    }

    conditions.push(
      `data ->> $${parameterIndex} = $${
        parameterIndex + 1
      }`
    );

    values.push(columnName);
    values.push(String(filterValue));

    parameterIndex += 2;
  }

  return {
    whereClause: conditions.join(" AND "),
    values,
  };
};

// =====================================================
// GET INSIGHTS
// =====================================================

const getInsights = async ({
  datasetId,
  filters = {},
}) => {
  // ---------------------------------------------------
  // Get dataset columns
  // ---------------------------------------------------

  const columns =
    await getDatasetColumns(datasetId);

  if (!columns.length) {
    throw new Error(
      "Dataset columns not found"
    );
  }

  // ---------------------------------------------------
  // Detect useful columns
  // ---------------------------------------------------

  const revenueColumn =
    findColumn(columns, [
      "revenue",
      "sales",
      "amount",
      "income",
    ]);

  const profitColumn =
    findColumn(columns, [
      "profit",
      "margin",
      "earnings",
    ]);

  const unitsColumn =
    findColumn(columns, [
      "units",
      "quantity",
      "volume",
    ]);

  const dateColumn =
    columns.find(
      (column) =>
        column.data_type === "DATE"
    );

  const categoryColumn =
    findColumn(columns, [
      "category",
      "product",
      "type",
      "segment",
    ]);

  const regionColumn =
    findColumn(columns, [
      "region",
      "location",
      "city",
      "state",
      "area",
    ]);

  // ---------------------------------------------------
  // Build WHERE clause
  // ---------------------------------------------------

  const {
    whereClause,
    values,
  } = buildWhereClause(
    datasetId,
    filters
  );

  // ===================================================
  // BASE METRIC QUERY
  // ===================================================

  const insightValues = [
    ...values,
  ];

  const revenueParam =
    revenueColumn
      ? insightValues.length + 1
      : null;

  if (revenueColumn) {
    insightValues.push(
      revenueColumn.column_name
    );
  }

  const profitParam =
    profitColumn
      ? insightValues.length + 1
      : null;

  if (profitColumn) {
    insightValues.push(
      profitColumn.column_name
    );
  }

  const unitsParam =
    unitsColumn
      ? insightValues.length + 1
      : null;

  if (unitsColumn) {
    insightValues.push(
      unitsColumn.column_name
    );
  }

  const metricResult =
    await pool.query(
      `SELECT
         COUNT(*)::int AS row_count,

         ${
           revenueColumn
             ? `COALESCE(
                  SUM(
                    NULLIF(
                      REPLACE(
                        data ->> $${revenueParam},
                        ',',
                        ''
                      ),
                      ''
                    )::numeric
                  ),
                  0
                )`
             : "0"
         } AS total_revenue,

         ${
           profitColumn
             ? `COALESCE(
                  SUM(
                    NULLIF(
                      REPLACE(
                        data ->> $${profitParam},
                        ',',
                        ''
                      ),
                      ''
                    )::numeric
                  ),
                  0
                )`
             : "0"
         } AS total_profit,

         ${
           unitsColumn
             ? `COALESCE(
                  SUM(
                    NULLIF(
                      REPLACE(
                        data ->> $${unitsParam},
                        ',',
                        ''
                      ),
                      ''
                    )::numeric
                  ),
                  0
                )`
             : "0"
         } AS total_units

       FROM dataset_rows
       WHERE ${whereClause}`,
      insightValues
    );

  const metrics =
    metricResult.rows[0];

  const insights = [];

  // ===================================================
  // 1. DATASET OVERVIEW
  // ===================================================

  insights.push({
    type: "summary",
    icon: "database",
    title: "Dataset Overview",
    message: `${metrics.row_count} records are currently being analyzed.`,
  });

  // ===================================================
  // 2. REVENUE
  // ===================================================

  if (revenueColumn) {
    insights.push({
      type: "metric",
      icon: "revenue",
      title: "Revenue",
      message: `Total revenue across the current selection is ₹${Number(
        metrics.total_revenue
      ).toLocaleString("en-IN")}.`,
    });
  }

  // ===================================================
  // 3. PROFIT
  // ===================================================

  if (profitColumn) {
    insights.push({
      type: "metric",
      icon: "profit",
      title: "Profit",
      message: `Total profit across the current selection is ₹${Number(
        metrics.total_profit
      ).toLocaleString("en-IN")}.`,
    });
  }

  // ===================================================
  // 4. TOP REVENUE CATEGORY
  // ===================================================

  if (
    categoryColumn &&
    revenueColumn
  ) {
    const categoryParam =
      values.length + 1;

    const revenueParam =
      values.length + 2;

    const result =
      await pool.query(
        `SELECT
           data ->> $${categoryParam} AS category,

           SUM(
             NULLIF(
               REPLACE(
                 data ->> $${revenueParam},
                 ',',
                 ''
               ),
               ''
             )::numeric
           ) AS revenue

         FROM dataset_rows

         WHERE ${whereClause}

         GROUP BY data ->> $${categoryParam}

         ORDER BY revenue DESC

         LIMIT 1`,
        [
          ...values,
          categoryColumn.column_name,
          revenueColumn.column_name,
        ]
      );

    if (result.rows.length) {
      const top =
        result.rows[0];

      insights.push({
        type: "leader",
        icon: "trophy",
        title:
          "Top Revenue Category",
        message: `${top.category} generated the highest revenue at ₹${Number(
          top.revenue
        ).toLocaleString("en-IN")}.`,
      });
    }
  }

  // ===================================================
  // 5. TOP PERFORMING REGION
  // ===================================================

  if (
    regionColumn &&
    revenueColumn
  ) {
    const regionParam =
      values.length + 1;

    const revenueParam =
      values.length + 2;

    const result =
      await pool.query(
        `SELECT
           data ->> $${regionParam} AS region,

           SUM(
             NULLIF(
               REPLACE(
                 data ->> $${revenueParam},
                 ',',
                 ''
               ),
               ''
             )::numeric
           ) AS revenue

         FROM dataset_rows

         WHERE ${whereClause}

         GROUP BY data ->> $${regionParam}

         ORDER BY revenue DESC

         LIMIT 1`,
        [
          ...values,
          regionColumn.column_name,
          revenueColumn.column_name,
        ]
      );

    if (result.rows.length) {
      const top =
        result.rows[0];

      insights.push({
        type: "leader",
        icon: "location",
        title:
          "Top Performing Region",
        message: `${top.region} generated the highest regional revenue at ₹${Number(
          top.revenue
        ).toLocaleString("en-IN")}.`,
      });
    }
  }

  // ===================================================
  // 6. LARGEST PROFIT CONTRIBUTOR
  // ===================================================

  if (
    categoryColumn &&
    profitColumn
  ) {
    const categoryParam =
      values.length + 1;

    const profitParam =
      values.length + 2;

    const result =
      await pool.query(
        `SELECT
           data ->> $${categoryParam} AS category,

           SUM(
             NULLIF(
               REPLACE(
                 data ->> $${profitParam},
                 ',',
                 ''
               ),
               ''
             )::numeric
           ) AS profit

         FROM dataset_rows

         WHERE ${whereClause}

         GROUP BY data ->> $${categoryParam}

         ORDER BY profit DESC

         LIMIT 1`,
        [
          ...values,
          categoryColumn.column_name,
          profitColumn.column_name,
        ]
      );

    if (result.rows.length) {
      const top =
        result.rows[0];

      insights.push({
        type: "profit",
        icon: "profit",
        title:
          "Largest Profit Contributor",
        message: `${top.category} generated the highest profit at ₹${Number(
          top.profit
        ).toLocaleString("en-IN")}.`,
      });
    }
  }

  // ===================================================
  // 7. MONTHLY REVENUE MOVEMENT
  // ===================================================

  if (
    dateColumn &&
    revenueColumn
  ) {
    const dateParam =
      values.length + 1;

    const revenueParam =
      values.length + 2;

    const result =
      await pool.query(
        `SELECT
           DATE_TRUNC(
             'month',
             (data ->> $${dateParam})::date
           ) AS month,

           SUM(
             NULLIF(
               REPLACE(
                 data ->> $${revenueParam},
                 ',',
                 ''
               ),
               ''
             )::numeric
           ) AS revenue

         FROM dataset_rows

         WHERE ${whereClause}

         GROUP BY month

         ORDER BY month`,
        [
          ...values,
          dateColumn.column_name,
          revenueColumn.column_name,
        ]
      );

    const monthly =
      result.rows;

    if (monthly.length >= 2) {
      const latest =
        Number(
          monthly[
            monthly.length - 1
          ].revenue
        );

      const previous =
        Number(
          monthly[
            monthly.length - 2
          ].revenue
        );

      if (previous !== 0) {
        const change =
          ((latest - previous) /
            previous) *
          100;

        const direction =
          change >= 0
            ? "increased"
            : "decreased";

        insights.push({
          type:
            change >= 0
              ? "positive"
              : "warning",

          icon:
            change >= 0
              ? "up"
              : "down",

          title:
            "Latest Revenue Movement",

          message: `Revenue ${direction} by ${Math.abs(
            change
          ).toFixed(
            1
          )}% compared with the previous month.`,
        });
      }
    }
  }

  // ===================================================
  // 8. VOLUME / UNITS
  // ===================================================

  if (unitsColumn) {
    insights.push({
      type: "metric",
      icon: "units",
      title: "Volume",
      message: `${Number(
        metrics.total_units
      ).toLocaleString(
        "en-IN"
      )} total units are represented in the current selection.`,
    });
  }

  // ===================================================
  // RETURN
  // ===================================================

  return {
    insights,

    detected: {
      revenue:
        revenueColumn?.column_name ||
        null,

      profit:
        profitColumn?.column_name ||
        null,

      units:
        unitsColumn?.column_name ||
        null,

      date:
        dateColumn?.column_name ||
        null,

      category:
        categoryColumn?.column_name ||
        null,

      region:
        regionColumn?.column_name ||
        null,
    },
  };
};

module.exports = {
  getInsights,
};