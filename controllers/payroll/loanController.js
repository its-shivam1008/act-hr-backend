const Loan = require("../../models/payrollModels/Loan");

// Helper: generate EMI schedule
const generateEMISchedule = (principalAmount, tenureMonths, startDate) => {
  const emiAmount = Math.round(principalAmount / tenureMonths);
  const emis = [];
  const base = startDate ? new Date(startDate) : new Date();

  for (let i = 0; i < tenureMonths; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    // Adjust last EMI for any rounding difference
    const isLast = i === tenureMonths - 1;
    const paidSoFar = emiAmount * i;
    emis.push({
      month,
      amount: isLast ? principalAmount - paidSoFar : emiAmount,
      status: "Pending",
    });
  }
  return emis;
};

// Get all loans
const getLoans = async (req, res) => {
  try {
    const { organisationId, status, employeeId } = req.query;
    const query = {};
    if (organisationId) query.organisationId = organisationId;
    if (status)         query.status = status;
    if (employeeId)     query.employee = employeeId;

    const loans = await Loan.find(query)
      .populate("employee", "name employeeId")
      .sort({ createdAt: -1 });

    // Attach computed fields
    const result = loans.map((loan) => {
      const loanObj = loan.toObject({ virtuals: true });
      const amountPaid = loan.emis
        .filter((e) => e.status === "Recovered")
        .reduce((acc, e) => acc + e.amount, 0);
      loanObj.amountPaid = amountPaid;
      loanObj.outstandingBalance = loan.principalAmount - amountPaid;
      loanObj.emisRemaining = loan.emis.filter((e) => e.status === "Pending").length;
      return loanObj;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create loan application
const createLoan = async (req, res) => {
  try {
    const { principalAmount, tenureMonths, disbursementDate, ...rest } = req.body;
    const emis = generateEMISchedule(principalAmount, tenureMonths, disbursementDate);
    const emiAmount = emis[0]?.amount || 0;

    const loan = new Loan({
      ...rest,
      principalAmount,
      tenureMonths,
      disbursementDate: disbursementDate || null,
      emiAmount,
      emis,
      status: "Pending Approval",
    });
    const saved = await loan.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Approve loan
const approveLoan = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Not found" });
    loan.status = "Active";
    loan.approvedBy = req.user?._id || null;
    loan.disbursementDate = loan.disbursementDate || new Date();
    await loan.save();
    res.json(loan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Reject loan
const rejectLoan = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Not found" });
    loan.status = "Rejected";
    await loan.save();
    res.json(loan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get EMI schedule for a loan
const getLoanEMIs = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id).populate("employee", "name employeeId");
    if (!loan) return res.status(404).json({ message: "Not found" });
    res.json({ loan, emis: loan.emis });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Mark an EMI as recovered
const recoverEMI = async (req, res) => {
  try {
    const { emiMonth } = req.body;
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    const emi = loan.emis.find((e) => e.month === emiMonth);
    if (!emi) return res.status(404).json({ message: "EMI not found for this month" });

    emi.status      = "Recovered";
    emi.recoveredOn = new Date();

    // If all EMIs recovered, close the loan
    const allRecovered = loan.emis.every((e) => e.status === "Recovered");
    if (allRecovered) loan.status = "Closed";

    await loan.save();
    res.json(loan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getLoans, createLoan, approveLoan, rejectLoan, getLoanEMIs, recoverEMI };
