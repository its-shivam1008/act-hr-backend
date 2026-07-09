const VariablePay = require("../../models/payrollModels/VariablePay");

// ── GET all Variable Pay records ──────────────────────────────────────────────
exports.getVariablePays = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const filter = { organisationId: orgId };
    
    if (req.query.status && req.query.status !== "All") {
      filter.status = req.query.status;
    }
    if (req.query.type && req.query.type !== "All") {
      filter.type = req.query.type;
    }

    const records = await VariablePay.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST create Variable Pay ───────────────────────────────────────────────────
exports.createVariablePay = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const body = { ...req.body, organisationId: orgId };
    
    // Ensure amount is positive
    if (body.amount !== undefined && body.amount < 0) {
      return res.status(400).json({ success: false, message: "Amount cannot be negative" });
    }

    const record = await VariablePay.create(body);
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── PUT update Variable Pay ────────────────────────────────────────────────────
exports.updateVariablePay = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const existing = await VariablePay.findOne({ _id: req.params.id, organisationId: orgId });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Variable Pay record not found" });
    }

    Object.assign(existing, req.body);
    await existing.save();

    res.json({ success: true, data: existing });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── DELETE Variable Pay ────────────────────────────────────────────────────────
exports.deleteVariablePay = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const deleted = await VariablePay.findOneAndDelete({ _id: req.params.id, organisationId: orgId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Variable Pay record not found" });
    }
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET Budget vs Actuals Summary ──────────────────────────────────────────────
exports.getBudgetSummary = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    
    // Aggregate utilized amount by category groups
    const records = await VariablePay.find({ organisationId: orgId });
    
    // Grouping mapping:
    // Commission -> types containing 'Commission'
    // Performance -> types containing 'Performance' or 'Spot'
    // Referral -> types containing 'Referral'
    // Others -> everything else
    const budgetMap = {
      Commission: { category: 'Commission', allocated: 50000, utilized: 0 },
      Performance: { category: 'Performance', allocated: 30000, utilized: 0 },
      Referral: { category: 'Referral', allocated: 10000, utilized: 0 },
      Others: { category: 'Others', allocated: 5000, utilized: 0 }
    };

    records.forEach(r => {
      const type = r.type.toLowerCase();
      if (type.includes('commission')) {
        budgetMap.Commission.utilized += r.amount;
      } else if (type.includes('performance') || type.includes('spot')) {
        budgetMap.Performance.utilized += r.amount;
      } else if (type.includes('referral')) {
        budgetMap.Referral.utilized += r.amount;
      } else {
        budgetMap.Others.utilized += r.amount;
      }
    });

    res.json({
      success: true,
      data: Object.values(budgetMap)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST Push to Payroll ───────────────────────────────────────────────────────
// This marks all approved incentives for a given period as "Processed"
exports.pushToPayroll = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { period } = req.body;
    
    if (!period) {
      return res.status(400).json({ success: false, message: "Period is required" });
    }

    const result = await VariablePay.updateMany(
      { organisationId: orgId, period, status: "Approved" },
      { status: "Processed" }
    );

    res.json({
      success: true,
      message: `Successfully processed ${result.modifiedCount} approved variable pay items for ${period}`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
