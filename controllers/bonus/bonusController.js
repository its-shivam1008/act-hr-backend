const Bonus = require("../../models/bonus/Bonus");

// ─── GET All Bonuses ───────────────────────────────────────────────────────────
const getBonuses = async (req, res) => {
  try {
    const { personType, status, location, date, search } = req.query;
    const query = {};

    if (personType && personType !== "All Types") query.personType = personType;
    if (status && status !== "All") query.status = status;
    if (location && location !== "All Locations") query.location = location;
    if (date) {
      const d = new Date(date);
      const nextDay = new Date(d);
      nextDay.setDate(d.getDate() + 1);
      query.bonusDate = { $gte: d, $lt: nextDay };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
        { climsId: { $regex: search, $options: "i" } },
        { agency: { $regex: search, $options: "i" } },
      ];
    }

    const bonuses = await Bonus.find(query).sort({ createdAt: -1 });
    res.json(bonuses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET Single Bonus ──────────────────────────────────────────────────────────
const getBonusById = async (req, res) => {
  try {
    const bonus = await Bonus.findById(req.params.id);
    if (!bonus) return res.status(404).json({ message: "Bonus record not found" });
    res.json(bonus);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── CREATE Bonus ──────────────────────────────────────────────────────────────
const createBonus = async (req, res) => {
  try {
    const bonus = new Bonus({
      organisationId: req.body.organisationId || "default_org",
      ...req.body,
    });
    const saved = await bonus.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ─── BULK CREATE (Excel Import) ────────────────────────────────────────────────
const bulkCreateBonuses = async (req, res) => {
  try {
    const { records } = req.body;
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "No records provided for bulk import" });
    }
    const inserted = await Bonus.insertMany(records, { ordered: false });
    res.status(201).json({ message: `${inserted.length} records imported successfully`, records: inserted });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ─── UPDATE Bonus ──────────────────────────────────────────────────────────────
const updateBonus = async (req, res) => {
  try {
    const updated = await Bonus.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Bonus record not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ─── UPDATE STATUS (Approve/Reject) ───────────────────────────────────────────
const updateBonusStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Approved", "Rejected", "Pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }
    const updated = await Bonus.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Bonus record not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ─── BULK STATUS UPDATE (Bulk Approve/Reject) ─────────────────────────────────
const bulkUpdateStatus = async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No IDs provided" });
    }
    if (!["Approved", "Rejected", "Pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }
    const result = await Bonus.updateMany(
      { _id: { $in: ids } },
      { $set: { status } }
    );
    res.json({ message: `${result.modifiedCount} records updated to ${status}`, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ─── DELETE Bonus ──────────────────────────────────────────────────────────────
const deleteBonus = async (req, res) => {
  try {
    const deleted = await Bonus.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Bonus record not found" });
    res.json({ message: "Bonus record deleted successfully", id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getBonuses,
  getBonusById,
  createBonus,
  bulkCreateBonuses,
  updateBonus,
  updateBonusStatus,
  bulkUpdateStatus,
  deleteBonus,
};
