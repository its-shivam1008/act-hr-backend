const DeductionMaster = require("../../models/payrollModels/DeductionMaster");
const AdditionMaster = require("../../models/payrollModels/AdditionMaster");
const {
  buildTextSearch,
  parsePaging,
  paginateModelQuery,
} = require("../../utils/payrollQuery");

// ─── DEDUCTIONS ──────────────────────────────────────────────────────────────

const getDeductions = async (req, res) => {
  try {
    const orgId = req.query.organisationId || req.user?.organisationId;
    const paging = parsePaging(req.query, 25);
    const filters = [];
    if (orgId) filters.push({ organisationId: orgId });
    if (req.query.status && req.query.status !== "All")
      filters.push({ status: req.query.status });
    if (req.query.search)
      filters.push(
        buildTextSearch(req.query.search, [
          "name",
          "code",
          "category",
          "type",
          "glCode",
        ]),
      );
    const query = filters.length === 1 ? filters[0] : { $and: filters };

    const { items, pagination } = await paginateModelQuery({
      model: DeductionMaster,
      query,
      page: paging.page,
      limit: paging.limit,
      sortBy: paging.sortBy,
      sortOrder: paging.sortOrder,
    });

    res.json({ success: true, data: items, pagination });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createDeduction = async (req, res) => {
  try {
    const deduction = new DeductionMaster(req.body);
    const saved = await deduction.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateDeduction = async (req, res) => {
  try {
    const updated = await DeductionMaster.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteDeduction = async (req, res) => {
  try {
    const deleted = await DeductionMaster.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── ADDITIONS ───────────────────────────────────────────────────────────────

const getAdditions = async (req, res) => {
  try {
    const orgId = req.query.organisationId || req.user?.organisationId;
    const paging = parsePaging(req.query, 25);
    const filters = [];
    if (orgId) filters.push({ organisationId: orgId });
    if (req.query.status && req.query.status !== "All")
      filters.push({ status: req.query.status });
    if (req.query.search)
      filters.push(
        buildTextSearch(req.query.search, [
          "name",
          "code",
          "category",
          "type",
          "glCode",
          "formula",
        ]),
      );
    const query = filters.length === 1 ? filters[0] : { $and: filters };

    const { items, pagination } = await paginateModelQuery({
      model: AdditionMaster,
      query,
      page: paging.page,
      limit: paging.limit,
      sortBy: paging.sortBy,
      sortOrder: paging.sortOrder,
    });

    res.json({ success: true, data: items, pagination });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createAddition = async (req, res) => {
  try {
    const addition = new AdditionMaster(req.body);
    const saved = await addition.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateAddition = async (req, res) => {
  try {
    const updated = await AdditionMaster.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteAddition = async (req, res) => {
  try {
    const deleted = await AdditionMaster.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getDeductions,
  createDeduction,
  updateDeduction,
  deleteDeduction,
  getAdditions,
  createAddition,
  updateAddition,
  deleteAddition,
};
