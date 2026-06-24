const Invoice = require("../../models/contractor/Invoice");
const Agency = require("../../models/agencyModels/Agency");

// Get all invoices for organisation
exports.getInvoices = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const query = { organisationId: orgId };

    const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, count: invoices.length, data: invoices });
  } catch (err) {
    console.error("[GetInvoices]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Create new invoice
exports.createInvoice = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { invoiceNo, contractorId, billingPeriod, labourCount, rate, amount, status, date } = req.body;

    if (!invoiceNo || !contractorId || !billingPeriod || labourCount === undefined || !rate || !amount) {
      return res.status(422).json({ success: false, message: "Missing required fields" });
    }

    const agency = await Agency.findById(contractorId);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency/Contractor not found" });
    }

    const invoice = await Invoice.create({
      organisationId: orgId,
      invoiceNo,
      contractorId,
      contractorName: agency.agencyName,
      billingPeriod,
      labourCount,
      rate,
      amount,
      status: status || "Pending",
      date: date || new Date(),
    });

    return res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    console.error("[CreateInvoice]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update invoice status
exports.updateInvoiceStatus = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { status } = req.body;

    if (!status || !["Pending", "Verified", "Paid", "Disputed"].includes(status)) {
      return res.status(422).json({ success: false, message: "Invalid status value" });
    }

    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, organisationId: orgId },
      { $set: { status } },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    return res.json({ success: true, data: invoice });
  } catch (err) {
    console.error("[UpdateInvoiceStatus]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Delete invoice
exports.deleteInvoice = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, organisationId: orgId });

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    return res.json({ success: true, message: "Invoice deleted successfully" });
  } catch (err) {
    console.error("[DeleteInvoice]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};
