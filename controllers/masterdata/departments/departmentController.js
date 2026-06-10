const Department = require("../../../models/departmentModels/Department");

const getOrgId = (req) => req.user?.organisationId;

exports.getDepartments = async (req, res) => {
  try {
    const { search = "", isActive } = req.query;
    const filter = { organisationId: getOrgId(req) };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const departments = await Department.find(filter).sort({ name: 1 });
    res.status(200).json({ success: true, count: departments.length, data: departments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDepartment = async (req, res) => {
  try {
    const department = await Department.findOne({ _id: req.params.id, organisationId: getOrgId(req) });
    if (!department) return res.status(404).json({ success: false, message: "Department not found" });
    res.status(200).json({ success: true, data: department });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { name, description, numberOfEmployees, isActive } = req.body;
    const department = await Department.create({
      organisationId: getOrgId(req),
      name,
      description,
      numberOfEmployees: numberOfEmployees || 0,
      isActive: isActive !== undefined ? isActive : true,
    });
    res.status(201).json({ success: true, data: department });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A department with this name already exists in your organisation",
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const allowed = ["name", "description", "numberOfEmployees", "isActive"];
    const updates = {};
    allowed.forEach(key => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

    const department = await Department.findOneAndUpdate(
      { _id: req.params.id, organisationId: getOrgId(req) },
      updates,
      { new: true, runValidators: true }
    );
    if (!department) return res.status(404).json({ success: false, message: "Department not found" });
    res.status(200).json({ success: true, data: department });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A department with this name already exists in your organisation",
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findOneAndDelete({ _id: req.params.id, organisationId: getOrgId(req) });
    if (!department) return res.status(404).json({ success: false, message: "Department not found" });
    res.status(200).json({ success: true, message: "Department deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleDepartmentStatus = async (req, res) => {
  try {
    const department = await Department.findOne({ _id: req.params.id, organisationId: getOrgId(req) });
    if (!department) return res.status(404).json({ success: false, message: "Department not found" });

    department.isActive = !department.isActive;
    await department.save();
    res.status(200).json({ success: true, data: department });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
