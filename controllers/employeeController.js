const Employee        = require("../models/Employee");
const { EmployeeFormConfig } = require("../models/EmployeeFormConfig");
const Department      = require("../models/departmentModels/Department");
const Designation     = require("../models/designationModels/Designation");
const EmploymentType  = require("../models/employmentTypeModels/EmploymentType");
const Location        = require("../models/locationModels/Location");
const SkillLevel      = require("../models/skillLevelModels/SkillLevel");
const ComplianceZone  = require("../models/wageCategories/ComplianceZone");
const mongoose        = require("mongoose");

// ── Resolve denormalised names from master data ───────────────────────────────
const resolveNames = async (body) => {
  const extra = {};
  const tryName = async (Model, id, key, field = "name") => {
    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) return;
    const doc = await Model.findById(id).select(field).lean();
    if (doc) extra[key] = doc[field] || "";
  };
  await Promise.all([
    tryName(Department,     body.department,          "departmentName"),
    tryName(Designation,    body.designation,          "designationName"),
    tryName(EmploymentType, body.employmentType,       "employmentTypeName"),
    tryName(Location,       body.workLocation,         "workLocationName"),
    tryName(ComplianceZone, body.complianceZone,       "complianceZoneName"),
    tryName(SkillLevel,     body.complianceSkillLevel, "complianceSkillLevelName"),
    tryName(SkillLevel,     body.skillLevel,           "skillLevelName"),
  ]);
  return extra;
};

// ── Populate paths for nested refs ────────────────────────────────────────────
const POPULATE = [
  { path: "employment.department",         select: "name" },
  { path: "employment.designation",        select: "name" },
  { path: "employment.employmentType",     select: "name" },
  { path: "employment.workLocation",       select: "name" },
  { path: "employment.complianceZone",     select: "name" },
  { path: "employment.complianceSkillLevel", select: "name levelNumber" },
  { path: "employment.skillLevel",         select: "name levelNumber" },
];

// ── flat req.body → nested Employee document ──────────────────────────────────
const flatToNested = (body, names = {}) => ({
  personalInfo: {
    firstName:     body.firstName,     lastName:      body.lastName,
    workEmail:     body.workEmail,     phone:         body.phone,
    gender:        body.gender,        dateOfBirth:   body.dateOfBirth,
    bloodGroup:    body.bloodGroup,    nationality:   body.nationality,
    maritalStatus: body.maritalStatus, personalEmail: body.personalEmail,
    altPhone:      body.altPhone,
    ...(body.employeeId !== undefined && { employeeId: body.employeeId }),
  },
  employment: {
    department:               body.department,
    departmentName:           names.departmentName           ?? body.departmentName,
    designation:              body.designation,
    designationName:          names.designationName          ?? body.designationName,
    employmentType:           body.employmentType,
    employmentTypeName:       names.employmentTypeName       ?? body.employmentTypeName,
    dateOfJoining:            body.dateOfJoining,
    workLocation:             body.workLocation,
    workLocationName:         names.workLocationName         ?? body.workLocationName,
    complianceZone:           body.complianceZone,
    complianceZoneName:       names.complianceZoneName       ?? body.complianceZoneName,
    complianceSkillLevel:     body.complianceSkillLevel,
    complianceSkillLevelName: names.complianceSkillLevelName ?? body.complianceSkillLevelName,
    skillLevel:               body.skillLevel,
    skillLevelName:           names.skillLevelName           ?? body.skillLevelName,
    status:          body.status,
    probationPeriod: body.probationPeriod, noticePeriod: body.noticePeriod,
    reportingManager: body.reportingManager,
    confirmationDate: body.confirmationDate, dateOfLeaving: body.dateOfLeaving,
  },
  financial: {
    basicSalary: body.basicSalary, hra: body.hra, da: body.da,
    conveyanceAllowance: body.conveyanceAllowance, medicalAllowance: body.medicalAllowance,
    statutoryBonus: body.statutoryBonus, ctc: body.ctc,
    retrenchmentAllowance: body.retrenchmentAllowance, flexiBalance: body.flexiBalance,
  },
  statutory: {
    panNumber: body.panNumber, aadharNumber: body.aadharNumber,
    uanNumber: body.uanNumber, esiNumber: body.esiNumber,
    pfNumber: body.pfNumber,   passportNumber: body.passportNumber,
  },
  banking: {
    bankName: body.bankName, accountNumber: body.accountNumber,
    ifscCode: body.ifscCode, accountType: body.accountType,
  },
  address: {
    address: body.address,       addressLine2: body.addressLine2,
    city: body.city,             state: body.state,
    pincode: body.pincode,       country: body.country,
    emergencyContactName: body.emergencyContactName,
    emergencyContactPhone: body.emergencyContactPhone,
    emergencyContactRelation: body.emergencyContactRelation,
  },
  nominee: {
    nomineeName: body.nomineeName, nomineeRelation: body.nomineeRelation,
    nomineeDob: body.nomineeDob,   nomineeShare: body.nomineeShare,
  },
  family: {
    fatherName: body.fatherName, motherName: body.motherName,
    spouseName: body.spouseName, numberOfChildren: body.numberOfChildren,
  },
  education: {
    highestQualification: body.highestQualification, university: body.university,
    yearOfPassing: body.yearOfPassing,               percentage: body.percentage,
  },
  professional: {
    totalExperience: body.totalExperience, prevEmployer: body.prevEmployer,
    prevDesignation: body.prevDesignation, skills: body.skills,
  },
  documents: {
    photoUrl: body.photoUrl,           aadharDocUrl: body.aadharDocUrl,
    passbookUrl: body.passbookUrl,     panDocUrl: body.panDocUrl,
    offerLetterUrl: body.offerLetterUrl,
  },
  ...(body.familyMembers      !== undefined && { familyMembers:      body.familyMembers      }),
  ...(body.basicEducation     !== undefined && { basicEducation:     body.basicEducation     }),
  ...(body.technicalEducation !== undefined && { technicalEducation: body.technicalEducation }),
});

// ── nested Employee document → flat response object ───────────────────────────
// Fallbacks (??d.x) allow legacy flat documents to still display correctly.
const nestedToFlat = (doc) => {
  const d = doc.toObject ? doc.toObject({ virtuals: true }) : doc;
  const e = d.employment || {};
  const pi = d.personalInfo || {};
  return {
    _id: d._id, organisationId: d.organisationId,
    createdAt: d.createdAt, updatedAt: d.updatedAt,
    // personalInfo — with root-level fallbacks for legacy flat records
    employeeId:    pi.employeeId    ?? d.employeeId,
    firstName:     pi.firstName     ?? d.firstName,
    lastName:      pi.lastName      ?? d.lastName,
    workEmail:     pi.workEmail     ?? d.workEmail,
    phone:         pi.phone         ?? d.phone,
    gender:        pi.gender        ?? d.gender,
    dateOfBirth:   pi.dateOfBirth   ?? d.dateOfBirth,
    bloodGroup:    pi.bloodGroup    ?? d.bloodGroup,
    nationality:   pi.nationality   ?? d.nationality,
    maritalStatus: pi.maritalStatus ?? d.maritalStatus,
    personalEmail: pi.personalEmail ?? d.personalEmail,
    altPhone:      pi.altPhone      ?? d.altPhone,
    // employment — with root-level fallbacks
    department:               e.department               ?? d.department,
    departmentName:           e.departmentName           ?? d.departmentName,
    designation:              e.designation              ?? d.designation,
    designationName:          e.designationName          ?? d.designationName,
    employmentType:           e.employmentType           ?? d.employmentType,
    employmentTypeName:       e.employmentTypeName       ?? d.employmentTypeName,
    dateOfJoining:            e.dateOfJoining            ?? d.dateOfJoining,
    workLocation:             e.workLocation             ?? d.workLocation,
    workLocationName:         e.workLocationName         ?? d.workLocationName,
    complianceZone:           e.complianceZone           ?? d.complianceZone,
    complianceZoneName:       e.complianceZoneName       ?? d.complianceZoneName,
    complianceSkillLevel:     e.complianceSkillLevel     ?? d.complianceSkillLevel,
    complianceSkillLevelName: e.complianceSkillLevelName ?? d.complianceSkillLevelName,
    skillLevel:               e.skillLevel               ?? d.skillLevel,
    skillLevelName:           e.skillLevelName           ?? d.skillLevelName,
    status:           e.status           ?? d.status,
    probationPeriod:  e.probationPeriod  ?? d.probationPeriod,
    noticePeriod:     e.noticePeriod     ?? d.noticePeriod,
    reportingManager: e.reportingManager ?? d.reportingManager,
    confirmationDate: e.confirmationDate ?? d.confirmationDate,
    dateOfLeaving:    e.dateOfLeaving    ?? d.dateOfLeaving,
    // financial — with root-level fallbacks
    basicSalary:           (d.financial?.basicSalary)           ?? d.basicSalary,
    hra:                   (d.financial?.hra)                   ?? d.hra,
    da:                    (d.financial?.da)                    ?? d.da,
    conveyanceAllowance:   (d.financial?.conveyanceAllowance)   ?? d.conveyanceAllowance,
    medicalAllowance:      (d.financial?.medicalAllowance)      ?? d.medicalAllowance,
    statutoryBonus:        (d.financial?.statutoryBonus)        ?? d.statutoryBonus,
    ctc:                   (d.financial?.ctc)                   ?? d.ctc,
    retrenchmentAllowance: (d.financial?.retrenchmentAllowance) ?? d.retrenchmentAllowance,
    flexiBalance:          (d.financial?.flexiBalance)          ?? d.flexiBalance,
    // statutory
    panNumber:      (d.statutory?.panNumber)      ?? d.panNumber,
    aadharNumber:   (d.statutory?.aadharNumber)   ?? d.aadharNumber,
    uanNumber:      (d.statutory?.uanNumber)      ?? d.uanNumber,
    esiNumber:      (d.statutory?.esiNumber)      ?? d.esiNumber,
    pfNumber:       (d.statutory?.pfNumber)       ?? d.pfNumber,
    passportNumber: (d.statutory?.passportNumber) ?? d.passportNumber,
    // banking
    bankName:      (d.banking?.bankName)      ?? d.bankName,
    accountNumber: (d.banking?.accountNumber) ?? d.accountNumber,
    ifscCode:      (d.banking?.ifscCode)      ?? d.ifscCode,
    accountType:   (d.banking?.accountType)   ?? d.accountType,
    // address
    address:                  (d.address?.address)                  ?? d.address_line ?? d.address,
    addressLine2:             (d.address?.addressLine2)             ?? d.addressLine2,
    city:                     (d.address?.city)                     ?? d.city,
    state:                    (d.address?.state)                    ?? d.state,
    pincode:                  (d.address?.pincode)                  ?? d.pincode,
    country:                  (d.address?.country)                  ?? d.country,
    emergencyContactName:     (d.address?.emergencyContactName)     ?? d.emergencyContactName,
    emergencyContactPhone:    (d.address?.emergencyContactPhone)    ?? d.emergencyContactPhone,
    emergencyContactRelation: (d.address?.emergencyContactRelation) ?? d.emergencyContactRelation,
    // nominee
    nomineeName:     (d.nominee?.nomineeName)     ?? d.nomineeName,
    nomineeRelation: (d.nominee?.nomineeRelation) ?? d.nomineeRelation,
    nomineeDob:      (d.nominee?.nomineeDob)      ?? d.nomineeDob,
    nomineeShare:    (d.nominee?.nomineeShare)    ?? d.nomineeShare,
    // family
    fatherName:       (d.family?.fatherName)       ?? d.fatherName,
    motherName:       (d.family?.motherName)       ?? d.motherName,
    spouseName:       (d.family?.spouseName)       ?? d.spouseName,
    numberOfChildren: (d.family?.numberOfChildren) ?? d.numberOfChildren,
    // education
    highestQualification: (d.education?.highestQualification) ?? d.highestQualification,
    university:           (d.education?.university)           ?? d.university,
    yearOfPassing:        (d.education?.yearOfPassing)        ?? d.yearOfPassing,
    percentage:           (d.education?.percentage)           ?? d.percentage,
    // professional
    totalExperience: (d.professional?.totalExperience) ?? d.totalExperience,
    prevEmployer:    (d.professional?.prevEmployer)    ?? d.prevEmployer,
    prevDesignation: (d.professional?.prevDesignation) ?? d.prevDesignation,
    skills:          (d.professional?.skills)          ?? d.skills,
    // documents
    photoUrl:       (d.documents?.photoUrl)       ?? d.photoUrl,
    aadharDocUrl:   (d.documents?.aadharDocUrl)   ?? d.aadharDocUrl,
    passbookUrl:    (d.documents?.passbookUrl)    ?? d.passbookUrl,
    panDocUrl:      (d.documents?.panDocUrl)      ?? d.panDocUrl,
    offerLetterUrl: (d.documents?.offerLetterUrl) ?? d.offerLetterUrl,
    // arrays
    familyMembers: d.familyMembers, basicEducation: d.basicEducation, technicalEducation: d.technicalEducation,
  };
};

// ── GET /api/employees ────────────────────────────────────────────────────────
const getEmployees = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const orgId = req.user.organisationId;
    const query = { organisationId: orgId };
    if (status && status !== "All") query["employment.status"] = status;
    if (search) {
      const s = new RegExp(search, "i");
      query.$or = [
        { "personalInfo.firstName": s }, { "personalInfo.lastName": s },
        { "personalInfo.workEmail": s }, { "personalInfo.employeeId": s },
        { "employment.departmentName": s }, { "employment.designationName": s },
      ];
    }
    const total     = await Employee.countDocuments(query);
    const employees = await Employee.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .populate(POPULATE)
      .lean();
    return res.json({ success: true, total, page: Number(page), employees: employees.map(nestedToFlat) });
  } catch (err) {
    console.error("[GetEmployees]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/employees/:id ────────────────────────────────────────────────────
const getEmployee = async (req, res) => {
  try {
    const emp = await Employee
      .findOne({ _id: req.params.id, organisationId: req.user.organisationId })
      .populate(POPULATE).lean();
    if (!emp) return res.status(404).json({ success: false, message: "Employee not found" });
    return res.json({ success: true, employee: nestedToFlat(emp) });
  } catch (err) {
    console.error("[GetEmployee]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/employees ───────────────────────────────────────────────────────
const createEmployee = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const config = await EmployeeFormConfig.findOne({ organisationId: orgId });
    if (config) {
      const requiredFields = config.fields.filter(f => f.visible && f.required).map(f => f.fieldKey);
      const missing = requiredFields.filter(k => !req.body[k] && req.body[k] !== 0);
      if (missing.length > 0) {
        return res.status(422).json({ success: false, message: `Missing required fields: ${missing.join(", ")}`, missing });
      }
    }
    const names    = await resolveNames(req.body);
    const nested   = flatToNested(req.body, names);
    const employee = await Employee.create({ ...nested, organisationId: orgId, createdBy: req.user._id });
    return res.status(201).json({ success: true, employee: nestedToFlat(employee) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: "Duplicate value (employeeId or email already exists)" });
    console.error("[CreateEmployee]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/employees/:id ────────────────────────────────────────────────────
const updateEmployee = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const existing = await Employee.findOne({ _id: req.params.id, organisationId: orgId }).select("+password");
    if (!existing) return res.status(404).json({ success: false, message: "Employee not found" });

    const names  = await resolveNames(req.body);
    const nested = flatToNested(req.body, names);

    // If employeeId changed reset password
    const newEmpId = req.body.employeeId;
    if (newEmpId && newEmpId !== existing.personalInfo?.employeeId) {
      nested["personalInfo.employeeId"] = newEmpId;
      existing.password = newEmpId;
      existing.passwordChangedAt = new Date();
    }

    Object.assign(existing, nested);
    await existing.save();

    const updated = await Employee.findById(existing._id).populate(POPULATE).lean();
    return res.json({ success: true, employee: nestedToFlat(updated) });
  } catch (err) {
    console.error("[UpdateEmployee]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/employees/:id ─────────────────────────────────────────────────
const deleteEmployee = async (req, res) => {
  try {
    const emp = await Employee.findOneAndDelete({ _id: req.params.id, organisationId: req.user.organisationId });
    if (!emp) return res.status(404).json({ success: false, message: "Employee not found" });
    return res.json({ success: true, message: "Employee deleted" });
  } catch (err) {
    console.error("[DeleteEmployee]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/employees/form-config ────────────────────────────────────────────
const getFormConfig = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    let config = await EmployeeFormConfig.findOne({ organisationId: orgId });
    if (!config) {
      config = await EmployeeFormConfig.create(EmployeeFormConfig.buildDefault(orgId));
    } else {
      const { FIELD_DEFINITIONS } = require("../models/EmployeeFormConfig");
      const dbMap = new Map(config.fields.map(f => [f.fieldKey, f]));
      let changed = false;
      const reconciled = FIELD_DEFINITIONS.map((def, idx) => {
        const db = dbMap.get(def.fieldKey);
        if (db) {
          const dirty = db.inputType !== def.inputType || db.label !== def.label || db.section !== def.section;
          if (dirty) changed = true;
          return { fieldKey: def.fieldKey, label: def.label, section: def.section, inputType: def.inputType, visible: db.visible, required: db.required, order: db.order ?? idx };
        }
        changed = true;
        return { fieldKey: def.fieldKey, label: def.label, section: def.section, inputType: def.inputType, visible: def.defaultVisible, required: def.defaultRequired, order: idx };
      });
      if (changed) { config.fields = reconciled; await config.save(); }
    }
    return res.json({ success: true, config });
  } catch (err) {
    console.error("[GetEmployeeFormConfig]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/employees/form-config ────────────────────────────────────────────
const saveFormConfig = async (req, res) => {
  try {
    const { fields } = req.body;
    if (!Array.isArray(fields)) return res.status(422).json({ success: false, message: "fields must be an array" });
    const config = await EmployeeFormConfig.findOneAndUpdate(
      { organisationId: req.user.organisationId },
      { fields, updatedBy: req.user._id },
      { new: true, upsert: true }
    );
    return res.json({ success: true, config });
  } catch (err) {
    console.error("[SaveEmployeeFormConfig]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee, getFormConfig, saveFormConfig };
