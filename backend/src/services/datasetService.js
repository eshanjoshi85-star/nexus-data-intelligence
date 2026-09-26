const csv = require("csv-parser");
const { Readable } = require("stream");

const pool = require("../config/db");

const detectDataType = (values) => {
  const nonEmptyValues = values.filter(
    (value) => value !== null && value !== undefined && String(value).trim() !== ""
  );

  if (nonEmptyValues.length === 0) {
    return "TEXT";
  }

  const isBoolean = nonEmptyValues.every((value) =>
    ["true", "false", "yes", "no"].includes(
      String(value).trim().toLowerCase()
    )
  );

  if (isBoolean) {
    return "BOOLEAN";
  }

  const isNumber = nonEmptyValues.every(
    (value) =>
      String(value).trim() !== "" &&
      Number.isFinite(Number(String(value).replace(/,/g, "")))
  );

  if (isNumber) {
    return "NUMBER";
  }

  const isDate = nonEmptyValues.every((value) => {
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime());
  });

  if (isDate) {
    return "DATE";
  }

  const uniqueValues = new Set(
    nonEmptyValues.map((value) => String(value).trim().toLowerCase())
  );

  if (uniqueValues.size <= Math.max(20, nonEmptyValues.length * 0.05)) {
    return "CATEGORY";
  }

  return "TEXT";
};

const parseCSV = (buffer) => {
  return new Promise((resolve, reject) => {
    const rows = [];

    Readable.from(buffer)
      .pipe(csv())
      .on("data", (row) => {
        rows.push(row);
      })
      .on("end", () => {
        resolve(rows);
      })
      .on("error", reject);
  });
};

const processDataset = async ({
  ownerId,
  name,
  description,
  originalFilename,
  buffer,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const rows = await parseCSV(buffer);

    if (rows.length === 0) {
      throw new Error("CSV file contains no data rows");
    }

    const columnNames = Object.keys(rows[0]);

    if (columnNames.length === 0) {
      throw new Error("CSV file contains no columns");
    }

    // Create dataset
    const datasetResult = await client.query(
      `INSERT INTO datasets
       (owner_id, name, description, original_filename, row_count, column_count, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'PROCESSING')
       RETURNING id`,
      [
        ownerId,
        name,
        description || null,
        originalFilename,
        rows.length,
        columnNames.length,
      ]
    );

    const datasetId = datasetResult.rows[0].id;

    // Create column metadata
    for (let index = 0; index < columnNames.length; index++) {
      const columnName = columnNames[index];

      const values = rows.map((row) => row[columnName]);

      const dataType = detectDataType(values);

      const nonEmptyValues = values.filter(
        (value) =>
          value !== null &&
          value !== undefined &&
          String(value).trim() !== ""
      );

      const distinctCount = new Set(
        nonEmptyValues.map((value) => String(value))
      ).size;

      let minValue = null;
      let maxValue = null;
      let meanValue = null;

      if (dataType === "NUMBER") {
        const numbers = nonEmptyValues
          .map((value) => Number(String(value).replace(/,/g, "")))
          .filter(Number.isFinite);

        if (numbers.length > 0) {
          minValue = Math.min(...numbers);
          maxValue = Math.max(...numbers);
          meanValue =
            numbers.reduce((sum, value) => sum + value, 0) /
            numbers.length;
        }
      }

      await client.query(
        `INSERT INTO dataset_columns
         (
           dataset_id,
           column_name,
           display_name,
           data_type,
           ordinal_position,
           nullable_count,
           distinct_count,
           min_value,
           max_value,
           mean_value
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          datasetId,
          columnName,
          columnName,
          dataType,
          index,
          rows.length - nonEmptyValues.length,
          distinctCount,
          minValue,
          maxValue,
          meanValue,
        ]
      );
    }

    // Store rows as JSONB
    for (let index = 0; index < rows.length; index++) {
      await client.query(
        `INSERT INTO dataset_rows
         (dataset_id, row_number, data)
         VALUES ($1, $2, $3::jsonb)`,
        [datasetId, index + 1, JSON.stringify(rows[index])]
      );
    }

    await client.query(
      `UPDATE datasets
       SET status = 'READY'
       WHERE id = $1`,
      [datasetId]
    );

    await client.query("COMMIT");

    return {
      datasetId,
      rowCount: rows.length,
      columnCount: columnNames.length,
      columns: columnNames,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  processDataset,
};