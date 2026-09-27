const pool = require("../config/db");

const getDashboardData = async ({
  datasetId,
  filters = {},
}) => {
  // ----------------------------------------
  // 1. Get dataset
  // ----------------------------------------
  const datasetResult = await pool.query(
    `SELECT id, name, description, row_count, column_count, status
     FROM datasets
     WHERE id = $1`,
    [datasetId]
  );

  if (datasetResult.rows.length === 0) {
    throw new Error("Dataset not found");
  }

  const dataset = datasetResult.rows[0];

  if (dataset.status !== "READY") {
    throw new Error("Dataset is not ready");
  }

  // ----------------------------------------
  // 2. Get column metadata
  // ----------------------------------------
  const columnsResult = await pool.query(
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

  const columns = columnsResult.rows;

  const numericColumns = columns.filter(
    (column) => column.data_type === "NUMBER"
  );

  const dateColumns = columns.filter(
    (column) => column.data_type === "DATE"
  );

  const categoryColumns = columns.filter(
    (column) =>
      column.data_type === "CATEGORY" ||
      column.data_type === "TEXT"
  );

  // ----------------------------------------
  // 3. Automatically detect important columns
  // ----------------------------------------
  const revenueColumn = numericColumns.find((column) =>
    column.column_name.toLowerCase().includes("revenue")
  );

  const profitColumn = numericColumns.find((column) =>
    column.column_name.toLowerCase().includes("profit")
  );

  const unitsColumn = numericColumns.find((column) =>
    column.column_name.toLowerCase().includes("unit")
  );

  const primaryMetric =
    revenueColumn ||
    profitColumn ||
    numericColumns[0];

  // ----------------------------------------
  // 4. Build filters
  // ----------------------------------------
  const values = [datasetId];
  const conditions = [];

  // Date filter
  if (filters.date) {
    const {
      column,
      from,
      to,
    } = filters.date;

    const validDateColumn = dateColumns.find(
      (item) => item.column_name === column
    );

    if (!validDateColumn) {
      throw new Error(`Invalid date column: ${column}`);
    }

    if (from) {
      values.push(from);

      conditions.push(
        `(data ->> '${column}')::date >= $${values.length}`
      );
    }

    if (to) {
      values.push(to);

      conditions.push(
        `(data ->> '${column}')::date <= $${values.length}`
      );
    }
  }

  // Category filters
  if (Array.isArray(filters.category)) {
    for (const filter of filters.category) {
      const {
        column,
        values: filterValues,
      } = filter;

      const validCategoryColumn = categoryColumns.find(
        (item) => item.column_name === column
      );

      if (!validCategoryColumn) {
        throw new Error(`Invalid category column: ${column}`);
      }

      if (
        !Array.isArray(filterValues) ||
        filterValues.length === 0
      ) {
        continue;
      }

      values.push(filterValues);

      conditions.push(
        `(data ->> '${column}') = ANY($${values.length}::text[])`
      );
    }
  }

  // Numeric filters
  if (Array.isArray(filters.numeric)) {
    for (const filter of filters.numeric) {
      const {
        column,
        operator,
        value,
      } = filter;

      const validNumericColumn = numericColumns.find(
        (item) => item.column_name === column
      );

      if (!validNumericColumn) {
        throw new Error(`Invalid numeric column: ${column}`);
      }

      const allowedOperators = [
        "=",
        ">",
        ">=",
        "<",
        "<=",
      ];

      if (!allowedOperators.includes(operator)) {
        throw new Error(
          `Invalid numeric operator: ${operator}`
        );
      }

      values.push(value);

      conditions.push(
        `(data ->> '${column}')::numeric ${operator} $${values.length}`
      );
    }
  }

  const whereClause =
    conditions.length > 0
      ? `AND ${conditions.join(" AND ")}`
      : "";

  // ----------------------------------------
  // 5. KPI - filtered row count
  // ----------------------------------------
  const countResult = await pool.query(
    `SELECT COUNT(*) AS total_rows
     FROM dataset_rows
     WHERE dataset_id = $1
     ${whereClause}`,
    values
  );

  const totalRows = Number(
    countResult.rows[0].total_rows
  );

  // ----------------------------------------
  // 6. KPI - primary metric
  // ----------------------------------------
  let totalValue = 0;
  let averageValue = 0;

  if (primaryMetric) {
    const metricColumn = primaryMetric.column_name;

    const metricResult = await pool.query(
      `SELECT
         COALESCE(
           SUM(
             NULLIF(
               REPLACE(data ->> '${metricColumn}', ',', ''),
               ''
             )::numeric
           ),
           0
         ) AS total_value,

         COALESCE(
           AVG(
             NULLIF(
               REPLACE(data ->> '${metricColumn}', ',', ''),
               ''
             )::numeric
           ),
           0
         ) AS average_value

       FROM dataset_rows
       WHERE dataset_id = $1
       ${whereClause}`,
      values
    );

    totalValue = Number(
      metricResult.rows[0].total_value
    );

    averageValue = Number(
      metricResult.rows[0].average_value
    );
  }

  // ----------------------------------------
  // 7. KPI - total profit
  // ----------------------------------------
  let totalProfit = null;

  if (profitColumn) {
    const profitResult = await pool.query(
      `SELECT
         COALESCE(
           SUM(
             NULLIF(
               REPLACE(
                 data ->> '${profitColumn.column_name}',
                 ',',
                 ''
               ),
               ''
             )::numeric
           ),
           0
         ) AS total_profit

       FROM dataset_rows
       WHERE dataset_id = $1
       ${whereClause}`,
      values
    );

    totalProfit = Number(
      profitResult.rows[0].total_profit
    );
  }

  // ----------------------------------------
  // 8. KPI - total units
  // ----------------------------------------
  let totalUnits = null;

  if (unitsColumn) {
    const unitsResult = await pool.query(
      `SELECT
         COALESCE(
           SUM(
             NULLIF(
               REPLACE(
                 data ->> '${unitsColumn.column_name}',
                 ',',
                 ''
               ),
               ''
             )::numeric
           ),
           0
         ) AS total_units

       FROM dataset_rows
       WHERE dataset_id = $1
       ${whereClause}`,
      values
    );

    totalUnits = Number(
      unitsResult.rows[0].total_units
    );
  }

  // ==================================================
  // CHART DATA
  // ==================================================

  // ----------------------------------------
  // 9. Chart 1 - Revenue by Month
  // ----------------------------------------
  let revenueByMonth = [];

  if (dateColumns.length > 0 && revenueColumn) {
    const dateColumn = dateColumns[0].column_name;
    const metricColumn = revenueColumn.column_name;

    const chartResult = await pool.query(
      `SELECT
         TO_CHAR(
           DATE_TRUNC(
             'month',
             (data ->> '${dateColumn}')::date
           ),
           'YYYY-MM'
         ) AS month,

         COALESCE(
           SUM(
             NULLIF(
               REPLACE(
                 data ->> '${metricColumn}',
                 ',',
                 ''
               ),
               ''
             )::numeric
           ),
           0
         ) AS revenue

       FROM dataset_rows

       WHERE dataset_id = $1
       ${whereClause}

       GROUP BY
         DATE_TRUNC(
           'month',
           (data ->> '${dateColumn}')::date
         )

       ORDER BY
         DATE_TRUNC(
           'month',
           (data ->> '${dateColumn}')::date
         )`,
      values
    );

    revenueByMonth = chartResult.rows.map(
      (row) => ({
        month: row.month,
        revenue: Number(row.revenue),
      })
    );
  }

  // ----------------------------------------
  // 10. Chart 2 - Revenue by Region
  // ----------------------------------------
  let revenueByRegion = [];

  const regionColumn = categoryColumns.find(
    (column) =>
      column.column_name.toLowerCase() === "region"
  );

  if (regionColumn && revenueColumn) {
    const categoryColumn =
      regionColumn.column_name;

    const metricColumn =
      revenueColumn.column_name;

    const chartResult = await pool.query(
      `SELECT
         data ->> '${categoryColumn}' AS region,

         COALESCE(
           SUM(
             NULLIF(
               REPLACE(
                 data ->> '${metricColumn}',
                 ',',
                 ''
               ),
               ''
             )::numeric
           ),
           0
         ) AS revenue

       FROM dataset_rows

       WHERE dataset_id = $1
       ${whereClause}

       GROUP BY
         data ->> '${categoryColumn}'

       ORDER BY revenue DESC`,
      values
    );

    revenueByRegion = chartResult.rows.map(
      (row) => ({
        region: row.region,
        revenue: Number(row.revenue),
      })
    );
  }

  // ----------------------------------------
  // 11. Chart 3 - Profit by Category
  // ----------------------------------------
  let profitByCategory = [];

  const categoryColumn = categoryColumns.find(
    (column) =>
      column.column_name.toLowerCase() === "category"
  );

  if (profitColumn && categoryColumn) {
    const groupColumn =
      categoryColumn.column_name;

    const metricColumn =
      profitColumn.column_name;

    const chartResult = await pool.query(
      `SELECT
         data ->> '${groupColumn}' AS category,

         COALESCE(
           SUM(
             NULLIF(
               REPLACE(
                 data ->> '${metricColumn}',
                 ',',
                 ''
               ),
               ''
             )::numeric
           ),
           0
         ) AS profit

       FROM dataset_rows

       WHERE dataset_id = $1
       ${whereClause}

       GROUP BY
         data ->> '${groupColumn}'

       ORDER BY profit DESC`,
      values
    );

    profitByCategory = chartResult.rows.map(
      (row) => ({
        category: row.category,
        profit: Number(row.profit),
      })
    );
  }

  // ==================================================
  // FINAL RESPONSE
  // ==================================================

  return {
    dataset: {
      id: dataset.id,
      name: dataset.name,
      description: dataset.description,
      rowCount: dataset.row_count,
      columnCount: dataset.column_count,
    },

    columns,

    detected: {
      primaryMetric:
        primaryMetric?.column_name || null,

      revenue:
        revenueColumn?.column_name || null,

      profit:
        profitColumn?.column_name || null,

      units:
        unitsColumn?.column_name || null,

      date:
        dateColumns[0]?.column_name || null,

      categories:
        categoryColumns.map(
          (column) => column.column_name
        ),
    },

    kpis: {
      filteredRows: totalRows,
      totalValue,
      averageValue,
      totalProfit,
      totalUnits,
    },

    charts: {
      revenueByMonth,
      revenueByRegion,
      profitByCategory,
    },

    filters,
  };
};

module.exports = {
  getDashboardData,
};