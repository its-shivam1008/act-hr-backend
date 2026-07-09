const SalaryStructure = require("../../models/payrollModels/SalaryStructure");

// ── GET all structures for org ────────────────────────────────────────────────
exports.getStructures = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const structures = await SalaryStructure.find({ organisationId: orgId }).sort({ createdAt: -1 });
    res.json({ success: true, data: structures });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET single structure ──────────────────────────────────────────────────────
exports.getStructureById = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const structure = await SalaryStructure.findOne({ _id: req.params.id, organisationId: orgId });
    if (!structure) return res.status(404).json({ success: false, message: "Structure not found" });
    res.json({ success: true, data: structure });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST create new structure ─────────────────────────────────────────────────
exports.createStructure = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const body = { ...req.body, organisationId: orgId };

    // Validate: if ctc provided, sum of components should not exceed ctc
    const earnings = (body.components || []).filter(c => c.kind === "Earning");
    const earningFixed = earnings
      .filter(c => c.type === "Fixed")
      .reduce((s, c) => s + (c.value || 0), 0);

    const structure = await SalaryStructure.create(body);
    res.status(201).json({ success: true, data: structure });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Structure code already exists in this organisation" });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── PUT update structure ──────────────────────────────────────────────────────
exports.updateStructure = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const structure = await SalaryStructure.findOneAndUpdate(
      { _id: req.params.id, organisationId: orgId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!structure) return res.status(404).json({ success: false, message: "Structure not found" });
    res.json({ success: true, data: structure });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── DELETE structure ──────────────────────────────────────────────────────────
exports.deleteStructure = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const structure = await SalaryStructure.findOneAndDelete({ _id: req.params.id, organisationId: orgId });
    if (!structure) return res.status(404).json({ success: false, message: "Structure not found" });
    res.json({ success: true, message: "Salary structure deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST add component to structure ──────────────────────────────────────────
exports.addComponent = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const structure = await SalaryStructure.findOne({ _id: req.params.id, organisationId: orgId });
    if (!structure) return res.status(404).json({ success: false, message: "Structure not found" });
    structure.components.push(req.body);
    await structure.save();
    res.json({ success: true, data: structure });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── DELETE a component ────────────────────────────────────────────────────────
exports.removeComponent = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const structure = await SalaryStructure.findOne({ _id: req.params.id, organisationId: orgId });
    if (!structure) return res.status(404).json({ success: false, message: "Structure not found" });
    structure.components = structure.components.filter(
      c => c._id.toString() !== req.params.componentId
    );
    await structure.save();
    res.json({ success: true, data: structure });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST Simulate a CTC breakdown ────────────────────────────────────────────
exports.simulateCTC = async (req, res) => {
  try {
    const { ctc, components } = req.body; // ctc = annual CTC, components = array
    const monthlyCTC = ctc / 12;

    const result = {};
    let gross = 0;
    let remainingCTC = monthlyCTC;

    for (const comp of (components || [])) {
      if (comp.kind !== "Earning") continue;
      let amount = 0;
      if (comp.type === "Fixed") {
        amount = comp.value || 0;
      } else if (comp.type === "Percentage") {
        // formula: "50% of CTC" → use value as percentage
        amount = (comp.value / 100) * monthlyCTC;
      } else if (comp.type === "Formula") {
        // Simplified formula evaluation
        if (comp.formula && comp.formula.toLowerCase().includes("basic")) {
          const basicComp = components.find(c => c.category === "Basic" && c.kind === "Earning");
          const basicAmt = basicComp ? (basicComp.value / 100) * monthlyCTC : 0;
          amount = (comp.value / 100) * basicAmt;
        } else {
          amount = (comp.value / 100) * monthlyCTC;
        }
      }
      result[comp.name] = Math.round(amount);
      gross += amount;
      remainingCTC -= amount;
    }

    // Balancing component
    const balancing = components.find(c => c.type === "Balancing" && c.kind === "Earning");
    if (balancing) {
      result[balancing.name] = Math.max(0, Math.round(remainingCTC));
      gross += result[balancing.name];
    }

    res.json({ success: true, gross: Math.round(gross), monthlyCTC: Math.round(monthlyCTC), breakdown: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
