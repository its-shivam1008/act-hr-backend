const SalaryAdvance = require("../../models/payrollModels/SalaryAdvance");
const { resolveEmployeeSnapshot } = require("../../utils/payrollIdentity");
const {
  buildTextSearch,
  buildLocationFilter,
  buildDateFilter,
  parsePaging,
  paginateModelQuery,
} = require("../../utils/payrollQuery");

const buildAdvanceQuery = (orgId, queryString = {}) => {
  const filters = [{ organisationId: orgId }];
  const { status, employeeId, personType, search, location, date } =
    queryString;

  if (status && status !== "All") {
    filters.push(
      status.includes(",")
        ? { status: { $in: status.split(",").map((value) => value.trim()) } }
        : { status },
    );
  }
  if (employeeId) filters.push({ employee: employeeId });
  if (personType && personType !== "All") filters.push({ personType });
  if (location && location !== "All")
    filters.push(buildLocationFilter(location, ["locationId"]));
  if (search)
    filters.push(
      buildTextSearch(search, ["employeeName", "employeeId", "reason"]),
    );
  if (date) filters.push(buildDateFilter(date, ["createdAt", "requestDate"]));

  return filters.length === 1 ? filters[0] : { $and: filters };
};

// Get all advances (with optional filters)
const getAdvances = async (req, res) => {
  try {
    const orgId = req.query.organisationId || req.user?.organisationId;
    if (!orgId)
      return res.status(400).json({ message: "organisationId is required" });

    const paging = parsePaging(req.query, 25);
    const query = buildAdvanceQuery(orgId, req.query);

    const { items, pagination } = await paginateModelQuery({
      model: SalaryAdvance,
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

// Create advance request
const createAdvance = async (req, res) => {
  try {
    const { employee, organisationId, ...rest } = req.body;
    const orgId = organisationId || req.user?.organisationId;
    if (!orgId)
      return res.status(400).json({ message: "organisationId is required" });

    const snapshot = await resolveEmployeeSnapshot(orgId, employee);
    if (!snapshot)
      return res.status(404).json({ message: "Employee not found" });

    const advance = new SalaryAdvance({
      organisationId: orgId,
      employee,
      ...snapshot,
      ...rest,
      status: "Pending Approval",
    });
    const saved = await advance.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Approve advance
const approveAdvance = async (req, res) => {
  try {
    const { remarks } = req.body;
    const advance = await SalaryAdvance.findById(req.params.id);
    if (!advance) return res.status(404).json({ message: "Not found" });

    advance.status = "Active";
    advance.approvedBy = req.user?._id || null;
    advance.approvedAt = new Date();
    advance.remarks = remarks || "";
    await advance.save();
    res.json(advance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Reject advance
const rejectAdvance = async (req, res) => {
  try {
    const { remarks } = req.body;
    const advance = await SalaryAdvance.findById(req.params.id);
    if (!advance) return res.status(404).json({ message: "Not found" });

    advance.status = "Rejected";
    advance.remarks = remarks || "";
    await advance.save();
    res.json(advance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Mark as recovered
const recoverAdvance = async (req, res) => {
  try {
    const advance = await SalaryAdvance.findById(req.params.id);
    if (!advance) return res.status(404).json({ message: "Not found" });

    advance.status = "Recovered";
    await advance.save();
    res.json(advance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAdvances,
  createAdvance,
  approveAdvance,
  rejectAdvance,
  recoverAdvance,
};
