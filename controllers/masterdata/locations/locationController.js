const Location = require("../../../models/locationModels/Location");

const getOrgId = (req) => req.user?.organisationId;

exports.getLocations = async (req, res) => {
  try {
    const { search = "", isActive } = req.query;
    const filter = { organisationId: getOrgId(req) };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { locationType: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const locations = await Location.find(filter).sort({ name: 1 });
    res.status(200).json({ success: true, count: locations.length, data: locations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLocation = async (req, res) => {
  try {
    const location = await Location.findOne({ _id: req.params.id, organisationId: getOrgId(req) });
    if (!location) return res.status(404).json({ success: false, message: "Location not found" });
    res.status(200).json({ success: true, data: location });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createLocation = async (req, res) => {
  try {
    const {
      name, locationType, address, city, state, pincode, capacity, latitude, longitude, isActive,
      workingHours, contactDetails, facilities, dateRange, processes
    } = req.body;

    const location = await Location.create({
      organisationId: getOrgId(req),
      name, locationType, address, city, state, pincode, capacity, latitude, longitude,
      isActive: isActive !== undefined ? isActive : true,
      workingHours: workingHours || undefined,
      contactDetails: contactDetails || undefined,
      facilities: facilities || [],
      dateRange: dateRange || "1-30",
      processes: processes || undefined
    });

    res.status(201).json({ success: true, data: location });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A location with this name already exists in your organisation",
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const allowed = [
      "name", "locationType", "address", "city", "state", "pincode", "capacity", "latitude", "longitude", "isActive",
      "workingHours", "contactDetails", "facilities", "dateRange", "processes"
    ];
    const updates = {};
    allowed.forEach(key => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

    const location = await Location.findOneAndUpdate(
      { _id: req.params.id, organisationId: getOrgId(req) },
      updates,
      { new: true, runValidators: true }
    );

    if (!location) return res.status(404).json({ success: false, message: "Location not found" });
    res.status(200).json({ success: true, data: location });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A location with this name already exists in your organisation",
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteLocation = async (req, res) => {
  try {
    const location = await Location.findOneAndDelete({ _id: req.params.id, organisationId: getOrgId(req) });
    if (!location) return res.status(404).json({ success: false, message: "Location not found" });
    res.status(200).json({ success: true, message: "Location deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleLocationStatus = async (req, res) => {
  try {
    const location = await Location.findOne({ _id: req.params.id, organisationId: getOrgId(req) });
    if (!location) return res.status(404).json({ success: false, message: "Location not found" });

    location.isActive = !location.isActive;
    await location.save();
    res.status(200).json({ success: true, data: location });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
