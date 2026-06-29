const Holiday = require("../../models/attendance/Holiday");

// GET /api/attendance/holidays
const getHolidays = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { year, location, type, search } = req.query;

    const query = { organisationId: orgId };
    if (type && type !== "All") query.type = type;
    
    if (location && location !== "All Locations") {
      query.$or = [
        { location: "All" },
        { location: location }
      ];
    }

    if (year) {
      const y = Number(year);
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31, 23, 59, 59);
      query.date = { $gte: start, $lte: end };
    }

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const data = await Holiday.find(query).sort({ date: 1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/attendance/holidays
const createHoliday = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const body = { ...req.body, organisationId: orgId };

    const doc = await Holiday.create(body);
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "A holiday on this date already exists" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/attendance/holidays/:id
const deleteHoliday = async (req, res) => {
  try {
    const doc = await Holiday.findOneAndDelete({ _id: req.params.id, organisationId: req.user.organisationId });
    if (!doc) return res.status(404).json({ success: false, message: "Holiday not found" });
    res.json({ success: true, message: "Holiday deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getHolidays,
  createHoliday,
  deleteHoliday
};
