const Adjustment = require("../../models/payrollModels/Adjustment");
const { resolveEmployeeSnapshot } = require("../../utils/payrollIdentity");
const {
  buildTextSearch,
  buildLocationFilter,
  buildDateFilter,
  parsePaging,
  paginateModelQuery,
} = require("../../utils/payrollQuery");

const buildAdjustmentQuery = (orgId, queryString = {}) => {
  const filters = [{ organisationId: orgId }];
  const {
    isRecurring,
    status,
    employeeId,
    personType,
    search,
    location,
    date,
    adjustmentType,
    payrollMonth,
  } = queryString;

  if (status && status !== "All") filters.push({ status });
  if (employeeId) filters.push({ employee: employeeId });
  if (personType && personType !== "All") filters.push({ personType });
  if (adjustmentType && adjustmentType !== "All")
    filters.push({ adjustmentType });
  if (isRecurring !== undefined)
    filters.push({ isRecurring: isRecurring === "true" });
  if (location && location !== "All")
    filters.push(buildLocationFilter(location, ["locationId"]));
  if (search)
    filters.push(
      buildTextSearch(search, [
        "employeeName",
        "employeeId",
        "componentName",
        "componentCode",
        "reason",
      ]),
    );
  if (payrollMonth) filters.push({ payrollMonth });
  if (date) filters.push(buildDateFilter(date, ["createdAt", "payrollMonth"]));

  return filters.length === 1 ? filters[0] : { $and: filters };
};

// Get all adjustments
const getAdjustments = async (req, res) => {
  try {
    const orgId = req.query.organisationId || req.user?.organisationId;
    if (!orgId)
      return res.status(400).json({ message: "organisationId is required" });

    const paging = parsePaging(req.query, 25);
    const query = buildAdjustmentQuery(orgId, req.query);

    const { items, pagination } = await paginateModelQuery({
      model: Adjustment,
      query,
      page: paging.page,
      limit: paging.limit,
      sortBy: paging.sortBy,
      sortOrder: paging.sortOrder,
      populate: [{ path: "employee", select: "name employeeId" }],
    });

    res.json({ success: true, data: items, pagination });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create adjustment
const createAdjustment = async (req, res) => {
  try {
    const { employee, organisationId, ...rest } = req.body;
    const orgId = organisationId || req.user?.organisationId;
    if (!orgId)
      return res.status(400).json({ message: "organisationId is required" });

    const snapshot = await resolveEmployeeSnapshot(orgId, employee);
    if (!snapshot)
      return res.status(404).json({ message: "Employee not found" });

    const adjustment = new Adjustment({
      organisationId: orgId,
      employee,
      ...snapshot,
      ...rest,
    });
    const saved = await adjustment.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Update adjustment (e.g., stop recurring)
const updateAdjustment = async (req, res) => {
  try {
    const updated = await Adjustment.findByIdAndUpdate(
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

// Stop a recurring adjustment
const stopAdjustment = async (req, res) => {
  try {
    const adjustment = await Adjustment.findById(req.params.id);
    if (!adjustment) return res.status(404).json({ message: "Not found" });
    adjustment.status = "Stopped";
    adjustment.endMonth = req.body.endMonth || null;
    await adjustment.save();
    res.json(adjustment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete adjustment
const deleteAdjustment = async (req, res) => {
  try {
    const deleted = await Adjustment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAdjustments,
  createAdjustment,
  updateAdjustment,
  stopAdjustment,
  deleteAdjustment,
};
