const Labour             = require("../models/Labour");
const { LabourFormConfig } = require("../models/LabourFormConfig");
const Department         = require("../models/departmentModels/Department");
const Designation        = require("../models/designationModels/Designation");
const EmploymentType     = require("../models/employmentTypeModels/EmploymentType");
const Location           = require("../models/locationModels/Location");
const SkillLevel         = require("../models/skillLevelModels/SkillLevel");
const Agency             = require("../models/agencyModels/Agency");
const ComplianceZone     = require("../models/wageCategories/ComplianceZone");
const mongoose           = require("mongoose");

// ── Resolve denormalised names from master data ───────────────────────────────
const resolveNames = async (body) => {
  const extra = {};
  const tryName = async (Model, id, key, field = "name") => {
    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) return;
    const doc = await Model.findById(id).select(field).lean();
    if (doc) extra[key] = doc[field] || "";
  };
  await Promise.all([
    tryName(Location,      body.locationId,          "locationName"),
    tryName(EmploymentType,body.employmentType,       "employmentTypeName"),
    tryName(Agency,        body.agencyId,             "agencyName", "agencyName"),
    tryName(Department,    body.department,           "departmentName"),
    tryName(Designation,   body.designation,          "designationName"),
    tryName(ComplianceZone,body.complianceZone,       "complianceZoneName"),
    tryName(SkillLevel,    body.complianceSkillLevel, "complianceSkillLevelName"),
    tryName(SkillLevel,    body.skillLevel,           "skillLevelName"),
  ]);
  return extra;
};

// ── Populate paths for refs ────────────────────────────────────────────────────
const POPULATE = [
  { path: "employment.locationId",         select: "name city" },
  { path: "employment.employmentType",     select: "name" },
  { path: "employment.agencyId",           select: "agencyName" },
  { path: "employment.department",         select: "name" },
  { path: "employment.designation",        select: "name" },
  { path: "employment.complianceZone",     select: "name" },
  { path: "employment.complianceSkillLevel", select: "name levelNumber" },
  { path: "skill.skillLevel",              select: "name levelNumber" },
];

// ── flat req.body → nested Labour document ────────────────────────────────────
const flatToNested = (body, names = {}) => ({
  personalInfo: {
    firstName: body.firstName, lastName: body.lastName,
    email: body.email, mobile: body.mobile, sex: body.sex,
    dateOfBirth: body.dateOfBirth, nationality: body.nationality,
    identificationMark: body.identificationMark, medicalCondition: body.medicalCondition,
  },
  health: { bloodGroup: body.bloodGroup, allergies: body.allergies },
  employment: {
    dateOfJoining: body.dateOfJoining, climsId: body.climsId, formA: body.formA,
    locationId:               body.locationId,
    locationName:             names.locationName             ?? body.locationName,
    employmentType:           body.employmentType,
    employmentTypeName:       names.employmentTypeName       ?? body.employmentTypeName,
    agencyId:                 body.agencyId,
    agencyName:               names.agencyName               ?? body.agencyName,
    department:               body.department,
    departmentName:           names.departmentName           ?? body.departmentName,
    designation:              body.designation,
    designationName:          names.designationName          ?? body.designationName,
    complianceZone:           body.complianceZone,
    complianceZoneName:       names.complianceZoneName       ?? body.complianceZoneName,
    complianceSkillLevel:     body.complianceSkillLevel,
    complianceSkillLevelName: names.complianceSkillLevelName ?? body.complianceSkillLevelName,
    status: body.status,
  },
  skill: {
    skillLevel:         body.skillLevel,
    skillLevelName:     names.skillLevelName ?? body.skillLevelName,
    certifications:     body.certifications,
    previousExperience: body.previousExperience,
  },
  safety:      { safetyTraining: body.safetyTraining, safetyTrainingDate: body.safetyTrainingDate },
  preferences: { preferredShift: body.preferredShift, overtimeAvailability: body.overtimeAvailability, transportationMode: body.transportationMode },
  financial: {
    basicPay: body.basicPay, hra: body.hra, da: body.da,
    convenienceAllowance: body.convenienceAllowance, foodAllowance: body.foodAllowance,
    siteAllowance: body.siteAllowance, monthlyRate: body.monthlyRate,
    hourlyRate: body.hourlyRate, medical: body.medical, bonus: body.bonus,
    annualLeave: body.annualLeave, retrenchment: body.retrenchment, ratePerDay: body.ratePerDay,
  },
  statutory: { pan: body.pan, aadhaar: body.aadhaar, pfUan: body.pfUan, esic: body.esic },
  banking: { bankName: body.bankName, branchName: body.branchName, ifsc: body.ifsc, accountNumber: body.accountNumber },
  address: {
    localAddress: body.localAddress, state: body.state, city: body.city, pincode: body.pincode,
    permanentAddress: body.permanentAddress, permanentState: body.permanentState,
    permanentCity: body.permanentCity, permanentPincode: body.permanentPincode,
    emergencyContactName: body.emergencyContactName,
    emergencyContactRelation: body.emergencyContactRelation,
    emergencyContactPhone: body.emergencyContactPhone,
  },
  nominee: { nomineeName: body.nomineeName, nomineeAddress: body.nomineeAddress, nomineeRelation: body.nomineeRelation, nomineePhone: body.nomineePhone },
  documents: {
    aadhaarPhoto: body.aadhaarPhoto, passbook: body.passbook, photo: body.photo,
    education: body.education, drivingLicense: body.drivingLicense,
    policeClearance: body.policeClearance, medicalCertificate: body.medicalCertificate, photoUrl: body.photoUrl,
  },
  ...(body.familyMembers      !== undefined && { familyMembers:      body.familyMembers      }),
  ...(body.basicEducation     !== undefined && { basicEducation:     body.basicEducation     }),
  ...(body.technicalEducation !== undefined && { technicalEducation: body.technicalEducation }),
});

// ── nested Labour document → flat response object ─────────────────────────────
const nestedToFlat = (doc) => {
  const d = doc.toObject ? doc.toObject({ virtuals: true }) : doc;
  const e = d.employment || {};
  const sk = d.skill || {};
  const pi = d.personalInfo || {};
  return {
    _id: d._id, organisationId: d.organisationId, labourId: d.labourId,
    createdAt: d.createdAt, updatedAt: d.updatedAt,
    // personal — with root-level fallbacks for legacy flat records
    firstName:          pi.firstName          ?? d.firstName,
    lastName:           pi.lastName           ?? d.lastName,
    email:              pi.email              ?? d.email,
    mobile:             pi.mobile             ?? d.mobile,
    sex:                pi.sex                ?? d.sex,
    dateOfBirth:        pi.dateOfBirth        ?? d.dateOfBirth,
    nationality:        pi.nationality        ?? d.nationality,
    identificationMark: pi.identificationMark ?? d.identificationMark,
    medicalCondition:   pi.medicalCondition   ?? d.medicalCondition,
    // health
    bloodGroup: (d.health?.bloodGroup) ?? d.bloodGroup,
    allergies:  (d.health?.allergies)  ?? d.allergies,
    // employment — with root-level fallbacks
    dateOfJoining:            e.dateOfJoining            ?? d.dateOfJoining,
    climsId:                  e.climsId                  ?? d.climsId,
    formA:                    e.formA                    ?? d.formA,
    locationId:               e.locationId               ?? d.locationId,
    locationName:             e.locationName             ?? d.locationName,
    employmentType:           e.employmentType           ?? d.employmentType,
    employmentTypeName:       e.employmentTypeName       ?? d.employmentTypeName,
    agencyId:                 e.agencyId                 ?? d.agencyId,
    agencyName:               e.agencyName               ?? d.agencyName,
    department:               e.department               ?? d.department,
    departmentName:           e.departmentName           ?? d.departmentName,
    designation:              e.designation              ?? d.designation,
    designationName:          e.designationName          ?? d.designationName,
    complianceZone:           e.complianceZone           ?? d.complianceZone,
    complianceZoneName:       e.complianceZoneName       ?? d.complianceZoneName,
    complianceSkillLevel:     e.complianceSkillLevel     ?? d.complianceSkillLevel,
    complianceSkillLevelName: e.complianceSkillLevelName ?? d.complianceSkillLevelName,
    status:                   e.status                   ?? d.status,
    // skill — with root-level fallbacks
    skillLevel:         sk.skillLevel         ?? d.skillLevel,
    skillLevelName:     sk.skillLevelName     ?? d.skillLevelName,
    certifications:     sk.certifications     ?? d.certifications,
    previousExperience: sk.previousExperience ?? d.previousExperience,
    // safety
    safetyTraining:     (d.safety?.safetyTraining)     ?? d.safetyTraining,
    safetyTrainingDate: (d.safety?.safetyTrainingDate) ?? d.safetyTrainingDate,
    // preferences
    preferredShift:       (d.preferences?.preferredShift)       ?? d.preferredShift,
    overtimeAvailability: (d.preferences?.overtimeAvailability) ?? d.overtimeAvailability,
    transportationMode:   (d.preferences?.transportationMode)   ?? d.transportationMode,
    // financial — with root-level fallbacks
    basicPay:             (d.financial?.basicPay)             ?? d.basicPay,
    hra:                  (d.financial?.hra)                  ?? d.hra,
    da:                   (d.financial?.da)                   ?? d.da,
    convenienceAllowance: (d.financial?.convenienceAllowance) ?? d.convenienceAllowance,
    foodAllowance:        (d.financial?.foodAllowance)        ?? d.foodAllowance,
    siteAllowance:        (d.financial?.siteAllowance)        ?? d.siteAllowance,
    monthlyRate:          (d.financial?.monthlyRate)          ?? d.monthlyRate,
    hourlyRate:           (d.financial?.hourlyRate)           ?? d.hourlyRate,
    medical:              (d.financial?.medical)              ?? d.medical,
    bonus:                (d.financial?.bonus)                ?? d.bonus,
    annualLeave:          (d.financial?.annualLeave)          ?? d.annualLeave,
    retrenchment:         (d.financial?.retrenchment)         ?? d.retrenchment,
    ratePerDay:           (d.financial?.ratePerDay)           ?? d.ratePerDay,
    // statutory
    pan:    (d.statutory?.pan)    ?? d.pan,
    aadhaar:(d.statutory?.aadhaar)?? d.aadhaar,
    pfUan:  (d.statutory?.pfUan)  ?? d.pfUan,
    esic:   (d.statutory?.esic)   ?? d.esic,
    // banking
    bankName:      (d.banking?.bankName)      ?? d.bankName,
    branchName:    (d.banking?.branchName)    ?? d.branchName,
    ifsc:          (d.banking?.ifsc)          ?? d.ifsc,
    accountNumber: (d.banking?.accountNumber) ?? d.accountNumber,
    // address
    localAddress:             (d.address?.localAddress)             ?? d.localAddress,
    state:                    (d.address?.state)                    ?? d.state,
    city:                     (d.address?.city)                     ?? d.city,
    pincode:                  (d.address?.pincode)                  ?? d.pincode,
    permanentAddress:         (d.address?.permanentAddress)         ?? d.permanentAddress,
    permanentState:           (d.address?.permanentState)           ?? d.permanentState,
    permanentCity:            (d.address?.permanentCity)            ?? d.permanentCity,
    permanentPincode:         (d.address?.permanentPincode)         ?? d.permanentPincode,
    emergencyContactName:     (d.address?.emergencyContactName)     ?? d.emergencyContactName,
    emergencyContactRelation: (d.address?.emergencyContactRelation) ?? d.emergencyContactRelation,
    emergencyContactPhone:    (d.address?.emergencyContactPhone)    ?? d.emergencyContactPhone,
    // nominee
    nomineeName:     (d.nominee?.nomineeName)     ?? d.nomineeName,
    nomineeAddress:  (d.nominee?.nomineeAddress)  ?? d.nomineeAddress,
    nomineeRelation: (d.nominee?.nomineeRelation) ?? d.nomineeRelation,
    nomineePhone:    (d.nominee?.nomineePhone)    ?? d.nomineePhone,
    // documents
    aadhaarPhoto:       (d.documents?.aadhaarPhoto)       ?? d.aadhaarPhoto,
    passbook:           (d.documents?.passbook)           ?? d.passbook,
    photo:              (d.documents?.photo)              ?? d.photo,
    education:          (d.documents?.education)          ?? d.education,
    drivingLicense:     (d.documents?.drivingLicense)     ?? d.drivingLicense,
    policeClearance:    (d.documents?.policeClearance)    ?? d.policeClearance,
    medicalCertificate: (d.documents?.medicalCertificate) ?? d.medicalCertificate,
    photoUrl:           (d.documents?.photoUrl)           ?? d.photoUrl,
    // arrays
    familyMembers: d.familyMembers, basicEducation: d.basicEducation, technicalEducation: d.technicalEducation,

  };
};

// ── GET /api/labours ──────────────────────────────────────────────────────────
const getLabours = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const orgId = req.user.organisationId;
    const query = { organisationId: orgId };
    if (status && status !== "All") query["employment.status"] = status;
    if (search) {
      const s = new RegExp(search, "i");
      query.$or = [
        { "personalInfo.firstName": s }, { "personalInfo.lastName": s },
        { "personalInfo.email": s },     { labourId: s },
        { "employment.departmentName": s }, { "employment.designationName": s },
      ];
    }
    const total   = await Labour.countDocuments(query);
    const labours = await Labour.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .populate(POPULATE)
      .lean();
    return res.json({ success: true, total, page: Number(page), labours: labours.map(nestedToFlat) });
  } catch (err) {
    console.error("[GetLabours]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/labours/:id ──────────────────────────────────────────────────────
const getLabour = async (req, res) => {
  try {
    const labour = await Labour.findOne({ _id: req.params.id, organisationId: req.user.organisationId })
      .populate(POPULATE).lean();
    if (!labour) return res.status(404).json({ success: false, message: "Labour record not found" });
    return res.json({ success: true, labour: nestedToFlat(labour) });
  } catch (err) {
    console.error("[GetLabour]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/labours ─────────────────────────────────────────────────────────
const createLabour = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    // Validate required fields (flat keys)
    const config = await LabourFormConfig.findOne({ organisationId: orgId });
    if (config) {
      const requiredFields = config.fields.filter(f => f.visible && f.required).map(f => f.fieldKey);
      const missing = requiredFields.filter(k => !req.body[k] && req.body[k] !== 0);
      if (missing.length > 0) {
        return res.status(422).json({ success: false, message: `Missing required fields: ${missing.join(", ")}`, missing });
      }
    }
    const names  = await resolveNames(req.body);
    const nested = flatToNested(req.body, names);
    const labour = await Labour.create({ ...nested, organisationId: orgId, createdBy: req.user._id });
    return res.status(201).json({ success: true, labour: nestedToFlat(labour) });
  } catch (err) {
    console.error("[CreateLabour]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/labours/:id ──────────────────────────────────────────────────────
const updateLabour = async (req, res) => {
  try {
    const names  = await resolveNames(req.body);
    const nested = flatToNested(req.body, names);
    const labour = await Labour.findOneAndUpdate(
      { _id: req.params.id, organisationId: req.user.organisationId },
      { $set: nested },
      { new: true, runValidators: true }
    ).populate(POPULATE).lean();
    if (!labour) return res.status(404).json({ success: false, message: "Labour record not found" });
    return res.json({ success: true, labour: nestedToFlat(labour) });
  } catch (err) {
    console.error("[UpdateLabour]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/labours/:id ───────────────────────────────────────────────────
const deleteLabour = async (req, res) => {
  try {
    const labour = await Labour.findOneAndDelete({ _id: req.params.id, organisationId: req.user.organisationId });
    if (!labour) return res.status(404).json({ success: false, message: "Labour record not found" });
    return res.json({ success: true, message: "Labour record deleted" });
  } catch (err) {
    console.error("[DeleteLabour]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/labours/form-config ──────────────────────────────────────────────
const getFormConfig = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    let config = await LabourFormConfig.findOne({ organisationId: orgId });
    if (!config) {
      config = await LabourFormConfig.create(LabourFormConfig.buildDefault(orgId));
    } else {
      const { LABOUR_FIELD_DEFINITIONS } = require("../models/LabourFormConfig");
      const dbMap = new Map(config.fields.map(f => [f.fieldKey, f]));
      let changed = false;
      const reconciled = LABOUR_FIELD_DEFINITIONS.map((def, idx) => {
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
    console.error("[GetLabourFormConfig]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/labours/form-config ──────────────────────────────────────────────
const updateFormConfig = async (req, res) => {
  try {
    const { fields } = req.body;
    if (!Array.isArray(fields)) return res.status(422).json({ success: false, message: "fields must be an array" });
    const config = await LabourFormConfig.findOneAndUpdate(
      { organisationId: req.user.organisationId },
      { fields, updatedBy: req.user._id },
      { new: true, upsert: true }
    );
    return res.json({ success: true, config });
  } catch (err) {
    console.error("[UpdateLabourFormConfig]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getLabours, getLabour, createLabour, updateLabour, deleteLabour, getFormConfig, updateFormConfig };
