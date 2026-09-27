const pool = require("../config/db");

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

const findColumn = (columns, patterns) => {
  return columns.find((column) =>
    patterns.some((pattern) =>
      column.column_name
        .toLowerCase()
        .includes(pattern)
    )
  );
};

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
    whereClause:
      conditions.join(" AND "),
    values,
  };
};

const getInsights = async ({
  datasetId,
  filters = {},
}) => {
  const columns =
    await getDatasetColumns(
      datasetId
    );

  if (!columns.length) {
    throw new Error(
      "Dataset columns not found"
    );
  }

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

  const {
    whereClause,
    values,
  } = buildWhereClause(
    datasetId,
    filters
  );

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

  // ------------------------------------------
  // Dataset overview
  // ------------------------------------------

  insights.push({
    type: "summary",
    icon: "database",
    title: "Dataset Overview",
    message: `${metrics.row_count} records are currently being analyzed.`,
  });

  // ------------------------------------------
  // Revenue
  // ------------------------------------------

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

  // ------------------------------------------
  // Profit
  // ------------------------------------------

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

  // ------------------------------------------
  // Top revenue category
  // ------------------------------------------

  if (
    categoryColumn &&
    revenueColumn
  ) {
    const result =
      await pool.query(
        `SELECT
           data ->> $2 AS category,
           SUM(
             NULLIF(
               REPLACE(
                 data ->> $3,
                 ',',
                 ''
               ),
               ''
             )::numeric
           ) AS revenue
         FROM dataset_rows
         WHERE ${whereClause}
         GROUP BY data ->> $2
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

  // ------------------------------------------
  // Top region
  // ------------------------------------------

  if (
    regionColumn &&
    revenueColumn
  ) {
    const result =
      await pool.query(
        `SELECT
           data ->> $2 AS region,
           SUM(
             NULLIF(
               REPLACE(
                 data ->> $3,
                 ',',
                 ''
               ),
               ''
             )::numeric
           ) AS revenue
         FROM dataset_rows
         WHERE ${whereClause}
         GROUP BY data ->> $2
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

  // ------------------------------------------
  // Top profit category
  // ------------------------------------------

  if (
    categoryColumn &&
    profitColumn
  ) {
    const result =
      await pool.query(
        `SELECT
           data ->> $2 AS category,
           SUM(
             NULLIF(
               REPLACE(
                 data ->> $3,
                 ',',
                 ''
               ),
               ''
             )::numeric
           ) AS profit
         FROM dataset_rows
         WHERE ${whereClause}
         GROUP BY data ->> $2
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

  // ------------------------------------------
  // Monthly revenue movement
  // ------------------------------------------

  if (
    dateColumn &&
    revenueColumn
  ) {
    const result =
      await pool.query(
        `SELECT
           DATE_TRUNC(
             'month',
             (data ->> $2)::date
           ) AS month,

           SUM(
             NULLIF(
               REPLACE(
                 data ->> $3,
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

  // ------------------------------------------
  // Units
  // ------------------------------------------

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