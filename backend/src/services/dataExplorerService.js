const pool = require("../config/db");

const getDatasetColumns = async (datasetId) => {
  const result = await pool.query(
    `SELECT
       column_name,
       display_name,
       data_type,
       ordinal_position,
       distinct_count,
       min_value,
       max_value
     FROM dataset_columns
     WHERE dataset_id = $1
     ORDER BY ordinal_position`,
    [datasetId]
  );

  return result.rows;
};

const getFilterOptions = async (datasetId, columns) => {
  const filterableColumns = columns.filter(
    (column) =>
      column.data_type === "CATEGORY" ||
      column.data_type === "TEXT" ||
      column.data_type === "BOOLEAN"
  );

  const options = {};

  for (const column of filterableColumns) {
    const result = await pool.query(
      `SELECT DISTINCT data ->> $1 AS value
       FROM dataset_rows
       WHERE dataset_id = $2
         AND NULLIF(TRIM(data ->> $1), '') IS NOT NULL
       ORDER BY value
       LIMIT 100`,
      [column.column_name, datasetId]
    );

    options[column.column_name] = result.rows
      .map((row) => row.value)
      .filter(Boolean);
  }

  return options;
};

const getDatasetRows = async ({
  datasetId,
  search = "",
  filters = {},
  page = 1,
  limit = 10,
}) => {
  const columns = await getDatasetColumns(datasetId);

  if (columns.length === 0) {
    throw new Error("Dataset columns not found");
  }

  const allowedColumns = new Set(
    columns.map((column) => column.column_name)
  );

  const conditions = ["dataset_id = $1"];
  const values = [datasetId];

  let parameterIndex = 2;

  if (search && search.trim()) {
    conditions.push(
      `data::text ILIKE $${parameterIndex}`
    );

    values.push(`%${search.trim()}%`);
    parameterIndex++;
  }

  if (filters && typeof filters === "object") {
    for (const [columnName, filterValue] of Object.entries(filters)) {
      if (
        !allowedColumns.has(columnName) ||
        filterValue === undefined ||
        filterValue === null ||
        String(filterValue).trim() === ""
      ) {
        continue;
      }

      conditions.push(
        `data ->> $${parameterIndex} = $${parameterIndex + 1}`
      );

      values.push(columnName);
      values.push(String(filterValue));

      parameterIndex += 2;
    }
  }

  const whereClause = conditions.join(" AND ");

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM dataset_rows
     WHERE ${whereClause}`,
    values
  );

  const total = countResult.rows[0].total;

  const safePage = Math.max(
    1,
    Number.parseInt(page, 10) || 1
  );

  const safeLimit = Math.min(
    100,
    Math.max(
      1,
      Number.parseInt(limit, 10) || 10
    )
  );

  const offset = (safePage - 1) * safeLimit;

  const rowsResult = await pool.query(
    `SELECT
       id,
       row_number,
       data
     FROM dataset_rows
     WHERE ${whereClause}
     ORDER BY row_number
     LIMIT $${parameterIndex}
     OFFSET $${parameterIndex + 1}`,
    [
      ...values,
      safeLimit,
      offset,
    ]
  );

  const filterOptions = await getFilterOptions(
    datasetId,
    columns
  );

  return {
    columns,
    filterOptions,
    rows: rowsResult.rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

module.exports = {
  getDatasetColumns,
  getDatasetRows,
  getFilterOptions,
};