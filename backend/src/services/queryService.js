const pool = require("../config/db");

const ALLOWED_AGGREGATIONS = {
  SUM: "SUM",
  AVG: "AVG",
  COUNT: "COUNT",
  MIN: "MIN",
  MAX: "MAX",
};

const ALLOWED_OPERATORS = {
  "=": "=",
  ">": ">",
  ">=": ">=",
  "<": "<",
  "<=": "<=",
};

const validateColumn = (column, columns) => {
  return columns.some((item) => item.column_name === column);
};

const getDatasetColumns = async (datasetId) => {
  const result = await pool.query(
    `SELECT column_name, data_type
     FROM dataset_columns
     WHERE dataset_id = $1
     ORDER BY ordinal_position`,
    [datasetId]
  );

  return result.rows;
};

const buildFilterConditions = (filters, columns, values) => {
  const conditions = [];

  if (!filters) {
    return conditions;
  }

  // Numeric filters
  if (Array.isArray(filters.numeric)) {
    for (const filter of filters.numeric) {
      const { column, operator, value } = filter;

      if (!validateColumn(column, columns)) {
        throw new Error(`Invalid column: ${column}`);
      }

      if (!ALLOWED_OPERATORS[operator]) {
        throw new Error(`Invalid operator: ${operator}`);
      }

      const columnInfo = columns.find(
        (item) => item.column_name === column
      );

      if (!["NUMBER", "DATE"].includes(columnInfo.data_type)) {
        throw new Error(
          `Column ${column} cannot be used as a numeric filter`
        );
      }

      const parameterIndex = values.length + 1;
      values.push(value);

      if (columnInfo.data_type === "NUMBER") {
        conditions.push(
          `(data ->> '${column}')::numeric ${ALLOWED_OPERATORS[operator]} $${parameterIndex}`
        );
      } else {
        conditions.push(
          `(data ->> '${column}')::date ${ALLOWED_OPERATORS[operator]} $${parameterIndex}`
        );
      }
    }
  }

  // Category filters
  if (Array.isArray(filters.category)) {
    for (const filter of filters.category) {
      const { column, operator, values: filterValues } = filter;

      if (!validateColumn(column, columns)) {
        throw new Error(`Invalid column: ${column}`);
      }

      if (operator !== "IN") {
        throw new Error("Category filters only support IN");
      }

      if (
        !Array.isArray(filterValues) ||
        filterValues.length === 0
      ) {
        throw new Error(
          `Category filter for ${column} requires values`
        );
      }

      const parameterIndex = values.length + 1;

      values.push(filterValues);

      conditions.push(
        `(data ->> '${column}') = ANY($${parameterIndex}::text[])`
      );
    }
  }

  // Date range filter
  if (filters.date) {
    const { column, from, to } = filters.date;

    if (!validateColumn(column, columns)) {
      throw new Error(`Invalid date column: ${column}`);
    }

    const columnInfo = columns.find(
      (item) => item.column_name === column
    );

    if (columnInfo.data_type !== "DATE") {
      throw new Error(
        `Column ${column} is not detected as a DATE column`
      );
    }

    if (from) {
      const parameterIndex = values.length + 1;
      values.push(from);

      conditions.push(
        `(data ->> '${column}')::date >= $${parameterIndex}`
      );
    }

    if (to) {
      const parameterIndex = values.length + 1;
      values.push(to);

      conditions.push(
        `(data ->> '${column}')::date <= $${parameterIndex}`
      );
    }
  }

  return conditions;
};

const executeQuery = async ({
  datasetId,
  filters,
  groupBy,
  metric,
  aggregation = "SUM",
}) => {
  const columns = await getDatasetColumns(datasetId);

  if (columns.length === 0) {
    throw new Error("Dataset columns not found");
  }

  if (!metric || !validateColumn(metric, columns)) {
    throw new Error(`Invalid metric column: ${metric}`);
  }

  const normalizedAggregation = aggregation.toUpperCase();

  if (!ALLOWED_AGGREGATIONS[normalizedAggregation]) {
    throw new Error(`Invalid aggregation: ${aggregation}`);
  }

  const metricInfo = columns.find(
    (item) => item.column_name === metric
  );

  if (
    normalizedAggregation !== "COUNT" &&
    metricInfo.data_type !== "NUMBER"
  ) {
    throw new Error(
      `${normalizedAggregation} requires a numeric metric`
    );
  }

  if (groupBy && !validateColumn(groupBy, columns)) {
    throw new Error(`Invalid group-by column: ${groupBy}`);
  }

  const values = [];

  const conditions = buildFilterConditions(
    filters,
    columns,
    values
  );

  const whereClause =
    conditions.length > 0
      ? `AND ${conditions.join(" AND ")}`
      : "";

  let selectGroup = "";
  let groupClause = "";
  let orderClause = "";

  if (groupBy) {
    selectGroup = `data ->> '${groupBy}' AS "group",`;

    groupClause = `
      GROUP BY data ->> '${groupBy}'
    `;

    orderClause = `ORDER BY value DESC`;
  }

  let aggregationExpression;

  if (normalizedAggregation === "COUNT") {
    aggregationExpression = "COUNT(*)";
  } else {
    aggregationExpression = `
      ${normalizedAggregation}(
        NULLIF(REPLACE(data ->> '${metric}', ',', ''), '')::numeric
      )
    `;
  }

  const query = `
    SELECT
      ${selectGroup}
      ${aggregationExpression} AS value
    FROM dataset_rows
    WHERE dataset_id = $${values.length + 1}
    ${whereClause}
    ${groupClause}
    ${orderClause}
  `;

  values.push(datasetId);

  // Dataset ID is added last, so reorder parameters if filters exist.
  const reorderedValues = [datasetId, ...values.slice(0, -1)];

  const result = await pool.query(query, reorderedValues);

  return {
    datasetId,
    groupBy: groupBy || null,
    metric,
    aggregation: normalizedAggregation,
    filters: filters || {},
    data: result.rows,
  };
};

module.exports = {
  executeQuery,
};