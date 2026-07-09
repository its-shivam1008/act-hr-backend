const Employee = require("../models/Employee");
const Labour = require("../models/Labour");

const getEmployeeDisplayName = (employee) => {
  const firstName =
    employee.personalInfo?.firstName || employee.firstName || "";
  const lastName = employee.personalInfo?.lastName || employee.lastName || "";
  return `${firstName} ${lastName}`.trim();
};

const resolveEmployeeSnapshot = async (organisationId, employeeId) => {
  const employee = await Employee.findOne({
    _id: employeeId,
    organisationId,
  }).lean();
  if (!employee) return null;

  return {
    personType: "Employee",
    employeeName: getEmployeeDisplayName(employee),
    employeeId: employee.personalInfo?.employeeId || employee.employeeId || "",
    locationId: employee.employment?.workLocation || null,
    locationName: employee.employment?.workLocationName || "",
  };
};

const resolveLabourSnapshot = async (organisationId, labourId) => {
  const labour = await Labour.findOne({ _id: labourId, organisationId }).lean();
  if (!labour) return null;

  const firstName = labour.personalInfo?.firstName || labour.firstName || "";
  const lastName = labour.personalInfo?.lastName || labour.lastName || "";

  return {
    personType: "Labour",
    labourName: `${firstName} ${lastName}`.trim(),
    labourId: labour.labourId || "",
    locationId: labour.employment?.locationId || null,
    locationName: labour.employment?.locationName || "",
    formA: labour.employment?.formA || labour.formA || "",
    climsId: labour.employment?.climsId || labour.climsId || "",
    agency: labour.employment?.agencyName || labour.agencyName || "",
  };
};

module.exports = {
  resolveEmployeeSnapshot,
  resolveLabourSnapshot,
  getEmployeeDisplayName,
};
