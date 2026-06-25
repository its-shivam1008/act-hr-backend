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
app.use(
  "/api/masterdata/grades",
  require("./routes/masterdata/grades/gradeRoutes"),
);
app.use(
  "/api/masterdata/skills",
  require("./routes/masterdata/skills/skillRoutes"),
);
app.use(
  "/api/skill-assignments",
  require("./routes/masterdata/skills/skillAssignmentRoutes"),
);

// ── Employee Master ────────────────────────────────────────────────────────
app.use("/api/employees", require("./routes/employees/employeeRoutes"));

// ── Generic file upload (Cloudinary) ──────────────────────────────────────
app.use("/api/upload", require("./routes/uploadRoutes"));

// ── Documents Management ───────────────────────────────────────────────────
app.use("/api/documents", require("./routes/documentRoutes"));

// ── Labour Master ──────────────────────────────────────────────────────────
app.use("/api/labours", require("./routes/labours/labourRoutes"));

// ── Contractor Billing / Invoices ──────────────────────────────────────────
app.use("/api/contractor-billing", require("./routes/contractor/invoiceRoutes"));

// ── Attendance Capture & Muster Roll ───────────────────────────────────────
app.use("/api/attendance", require("./routes/attendance/attendanceRoutes"));

// ── Gate Pass Management ───────────────────────────────────────────────────
app.use("/api/gatepasses", require("./routes/gatepass/gatePassRoutes"));

// ── Wage Categories (Minimum Wage Master) ─────────────────────────────────
app.use("/api/wage-categories", require("./routes/wageCategories/wageCategoryRoutes"));

// ── Employee Self-Service Portal ───────────────────────────────────────────
app.use(
  "/api/employee-portal",
  require("./routes/employeePortal/employeePortalRoutes"),
);

// ── Asset Management ───────────────────────────────────────────────────────
app.use("/api/assets", require("./routes/assets/assetRoutes"));

// ── Transfer Management ────────────────────────────────────────────────────
app.use("/api/transfers", require("./routes/transfers/transferRoutes"));

// ── Leave Management ───────────────────────────────────────────────────────
app.use("/api/leaves", require("./routes/leave/leaveRoutes"));

// ── Performance Management ─────────────────────────────────────────────────
app.use("/api/performance", require("./routes/performanceRoutes"));

// ── Payroll Masters (Deductions & Additions) ───────────────────────────────
app.use("/api/payroll/masters", require("./routes/payroll/payrollMasterRoutes"));

// ── Salary Advances ────────────────────────────────────────────────────────
app.use("/api/payroll/advances", require("./routes/payroll/advanceRoutes"));

// ── Loan Management ────────────────────────────────────────────────────────
app.use("/api/payroll/loans", require("./routes/payroll/loanRoutes"));

// ── Payroll Adjustments ────────────────────────────────────────────────────
app.use("/api/payroll/adjustments", require("./routes/payroll/adjustmentRoutes"));

app.get("/", (req, res) => {
  res.send("Server Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
