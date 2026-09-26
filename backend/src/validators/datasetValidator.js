const { z } = require("zod");

const datasetMetadataSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Dataset name is required")
    .max(255, "Dataset name must not exceed 255 characters"),

  description: z
    .string()
    .trim()
    .max(1000, "Description must not exceed 1000 characters")
    .optional()
    .default(""),
});

module.exports = {
  datasetMetadataSchema,
};