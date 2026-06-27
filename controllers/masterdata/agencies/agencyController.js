const Agency = require("../../../models/agencyModels/Agency");

// ── Helper ─────────────────────────────────────────────────────────────────
const getOrgId = (req) => req.user?.organisationId;

// ── GET /api/masterdata/agencies ───────────────────────────────────────────
exports.getAgencies = async (req, res) => {
  try {
    const { search = "", isActive } = req.query;
    const filter = { organisationId: getOrgId(req) };

    if (search) {
      filter.$or = [
        { agencyName:    { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
        { email:         { $regex: search, $options: "i" } },
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const agencies = await Agency.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: agencies.length, data: agencies });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/masterdata/agencies/:id ──────────────────────────────────────
exports.getAgency = async (req, res) => {
  try {
    const agency = await Agency.findOne({
      _id: req.params.id,
      organisationId: getOrgId(req),
    });
    if (!agency) return res.status(404).json({ success: false, message: "Agency not found" });
    res.status(200).json({ success: true, data: agency });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/masterdata/agencies ─────────────────────────────────────────
exports.createAgency = async (req, res) => {
  try {
    const { agencyName, contactPerson, phone, email, address,
            licenseNo, licenseExpiry, contractStartDate, contractEndDate,
            isActive } = req.body;

    const agency = await Agency.create({
      organisationId: getOrgId(req),
      agencyName,
      contactPerson,
      phone,
      email,
      address,
      licenseNo,
      licenseExpiry:     licenseExpiry     || null,
      contractStartDate: contractStartDate || null,
      contractEndDate:   contractEndDate   || null,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({ success: true, data: agency });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "An agency with this name already exists in your organisation",
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── PUT /api/masterdata/agencies/:id ─────────────────────────────────────
exports.updateAgency = async (req, res) => {
  try {
    const allowed = [
      "agencyName", "contactPerson", "phone", "email", "address",
      "licenseNo", "licenseExpiry", "contractStartDate", "contractEndDate",
      "complianceScore", "performanceRating", "isActive",
    ];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    const agency = await Agency.findOneAndUpdate(
      { _id: req.params.id, organisationId: getOrgId(req) },
      updates,
      { new: true, runValidators: true }
    );

    if (!agency) return res.status(404).json({ success: false, message: "Agency not found" });
    res.status(200).json({ success: true, data: agency });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "An agency with this name already exists in your organisation",
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/masterdata/agencies/:id ──────────────────────────────────
exports.deleteAgency = async (req, res) => {
  try {
    const agency = await Agency.findOneAndDelete({
      _id: req.params.id,
      organisationId: getOrgId(req),
    });
    if (!agency) return res.status(404).json({ success: false, message: "Agency not found" });
    res.status(200).json({ success: true, message: "Agency deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/masterdata/agencies/:id/toggle ─────────────────────────────
exports.toggleAgencyStatus = async (req, res) => {
  try {
    const agency = await Agency.findOne({
      _id: req.params.id,
      organisationId: getOrgId(req),
    });
    if (!agency) return res.status(404).json({ success: false, message: "Agency not found" });

    agency.isActive = !agency.isActive;
    await agency.save();

    res.status(200).json({ success: true, data: agency });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
