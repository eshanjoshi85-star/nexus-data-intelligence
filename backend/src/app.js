const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const datasetRoutes = require("./routes/datasetRoutes");
const queryRoutes = require("./routes/queryRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const dataExplorerRoutes = require("./routes/dataExplorerRoutes");
const insightRoutes =require("./routes/insightRoutes");
const app = express();

app.use(
  cors({
    origin:
      process.env.CLIENT_URL ||
      "http://localhost:5173",
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use("/api/health", healthRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/datasets", datasetRoutes);

app.use("/api/datasets", queryRoutes);

app.use("/api/datasets", dashboardRoutes);

app.use(
  "/api/datasets",
  dataExplorerRoutes
);
app.use(
  "/api/datasets",
  insightRoutes
);

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);

  res.status(error.status || 500).json({
    success: false,
    message:
      error.message ||
      "Internal server error",
  });
});

module.exports = app;