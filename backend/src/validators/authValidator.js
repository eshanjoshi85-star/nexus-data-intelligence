const { z } = require("zod");

const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters long"),

  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters long")
    .max(150, "Full name must not exceed 150 characters"),
});

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address"),

  password: z
    .string()
    .min(1, "Password is required"),
});

module.exports = {
  registerSchema,
  loginSchema,
};