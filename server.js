require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const connectDB = require("./config/db");

connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/auth", require("./routes/authRoutes"));

// ── Master Data ────────────────────────────────────────────────────────────
app.use(
  "/api/masterdata/agencies",
  require("./routes/masterdata/agencies/agencyRoutes"),
);
app.use(
  "/api/masterdata/employment-types",
  require("./routes/masterdata/employmentTypes/employmentTypeRoutes"),
);
app.use(
  "/api/masterdata/designations",
  require("./routes/masterdata/designations/designationRoutes"),
);
app.use(
  "/api/masterdata/skill-levels",
  require("./routes/masterdata/skillLevels/skillLevelRoutes"),
);
app.use(
  "/api/masterdata/departments",
  require("./routes/masterdata/departments/departmentRoutes"),
);
app.use(
  "/api/masterdata/locations",
  require("./routes/masterdata/locations/locationRoutes"),
);

// ── Employee Master ────────────────────────────────────────────────────────
app.use("/api/employees", require("./routes/employees/employeeRoutes"));

// ── Labour Master ──────────────────────────────────────────────────────────
app.use("/api/labours", require("./routes/labours/labourRoutes"));

// ── Employee Self-Service Portal ───────────────────────────────────────────
app.use(
  "/api/employee-portal",
  require("./routes/employeePortal/employeePortalRoutes"),
);

// ── Asset Management ───────────────────────────────────────────────────────
app.use("/api/assets", require("./routes/assets/assetRoutes"));

// ── Leave Management ───────────────────────────────────────────────────────
app.use("/api/leaves", require("./routes/leave/leaveRoutes"));

app.get("/", (req, res) => {
  res.send("Server Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
