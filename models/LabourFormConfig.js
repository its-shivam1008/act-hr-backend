const mongoose = require("mongoose");

// ── All configurable field definitions for Labour form ────────────────────────
const LABOUR_FIELD_DEFINITIONS = [
  // Personal Information
  { fieldKey: "firstName",          label: "First Name",           section: "Personal Information",  inputType: "text",   defaultVisible: true,  defaultRequired: true  },
  { fieldKey: "lastName",           label: "Last Name",            section: "Personal Information",  inputType: "text",   defaultVisible: true,  defaultRequired: true  },
  { fieldKey: "email",              label: "Email",                section: "Personal Information",  inputType: "email",  defaultVisible: true,  defaultRequired: false },
  { fieldKey: "mobile",             label: "Mobile",               section: "Personal Information",  inputType: "text",   defaultVisible: true,  defaultRequired: false },
  { fieldKey: "sex",                label: "Gender / Sex",         section: "Personal Information",  inputType: "select", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "dateOfBirth",        label: "Date of Birth",        section: "Personal Information",  inputType: "date",   defaultVisible: true,  defaultRequired: false },
  { fieldKey: "nationality",        label: "Nationality",          section: "Personal Information",  inputType: "text",   defaultVisible: true,  defaultRequired: false },
  { fieldKey: "identificationMark", label: "Identification Mark",  section: "Personal Information",  inputType: "text",   defaultVisible: false, defaultRequired: false },
  { fieldKey: "medicalCondition",   label: "Medical Condition",    section: "Personal Information",  inputType: "text",   defaultVisible: false, defaultRequired: false },
  { fieldKey: "bloodGroup",         label: "Blood Group",          section: "Personal Information",  inputType: "select", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "allergies",          label: "Allergies",            section: "Personal Information",  inputType: "text",   defaultVisible: false, defaultRequired: false },

  // Employment Details
  { fieldKey: "dateOfJoining",      label: "Date of Joining",      section: "Employment Details",    inputType: "date",   defaultVisible: true,  defaultRequired: true  },
  { fieldKey: "climsId",            label: "CLIMS ID",             section: "Employment Details",    inputType: "text",   defaultVisible: true,  defaultRequired: false },
  { fieldKey: "formA",              label: "Form A",               section: "Employment Details",    inputType: "text",   defaultVisible: false, defaultRequired: false },
  { fieldKey: "locationId",         label: "Location",             section: "Employment Details",    inputType: "text",   defaultVisible: true,  defaultRequired: false },
  { fieldKey: "employmentType",     label: "Employment Type",      section: "Employment Details",    inputType: "select", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "agencyId",           label: "Agency",               section: "Employment Details",    inputType: "text",   defaultVisible: false, defaultRequired: false },
  { fieldKey: "department",         label: "Department",           section: "Employment Details",    inputType: "select", defaultVisible: true,  defaultRequired: true  },
  { fieldKey: "designation",        label: "Designation",          section: "Employment Details",    inputType: "text",   defaultVisible: true,  defaultRequired: false },
  { fieldKey: "complianceZone",     label: "Compliance Zone",      section: "Employment Details",    inputType: "text",   defaultVisible: false, defaultRequired: false },
  { fieldKey: "complianceSkillLevel", label: "Compliance Skill Level", section: "Employment Details", inputType: "text", defaultVisible: false, defaultRequired: false },
  { fieldKey: "status",             label: "Status",               section: "Employment Details",    inputType: "select", defaultVisible: true,  defaultRequired: false },

  // Skill Information
  { fieldKey: "skillLevel",         label: "Skill Level",          section: "Skill Information",     inputType: "select", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "certifications",     label: "Certifications",       section: "Skill Information",     inputType: "text",   defaultVisible: true,  defaultRequired: false },
  { fieldKey: "previousExperience", label: "Previous Experience",  section: "Skill Information",     inputType: "text",   defaultVisible: false, defaultRequired: false },

  // Safety Information
  { fieldKey: "safetyTraining",     label: "Safety Training",      section: "Safety Information",    inputType: "text",   defaultVisible: true,  defaultRequired: false },
  { fieldKey: "safetyTrainingDate", label: "Safety Training Date", section: "Safety Information",    inputType: "date",   defaultVisible: true,  defaultRequired: false },

  // Work Preferences
  { fieldKey: "preferredShift",        label: "Preferred Shift",      section: "Work Preferences",  inputType: "select", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "overtimeAvailability",  label: "Overtime Availability",section: "Work Preferences",  inputType: "select", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "transportationMode",    label: "Transportation Mode",  section: "Work Preferences",  inputType: "text",   defaultVisible: false, defaultRequired: false },

  // Financial Information
  { fieldKey: "basicPay",             label: "Basic Pay",             section: "Financial Information", inputType: "number", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "hra",                  label: "HRA",                   section: "Financial Information", inputType: "number", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "da",                   label: "DA",                    section: "Financial Information", inputType: "number", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "convenienceAllowance", label: "Convenience Allowance", section: "Financial Information", inputType: "number", defaultVisible: false, defaultRequired: false },
  { fieldKey: "foodAllowance",        label: "Food Allowance",        section: "Financial Information", inputType: "number", defaultVisible: false, defaultRequired: false },
  { fieldKey: "siteAllowance",        label: "Site Allowance",        section: "Financial Information", inputType: "number", defaultVisible: false, defaultRequired: false },
  { fieldKey: "monthlyRate",          label: "Monthly Rate",          section: "Financial Information", inputType: "number", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "hourlyRate",           label: "Hourly Rate",           section: "Financial Information", inputType: "number", defaultVisible: false, defaultRequired: false },
  { fieldKey: "medical",              label: "Medical",               section: "Financial Information", inputType: "number", defaultVisible: false, defaultRequired: false },
  { fieldKey: "bonus",                label: "Bonus",                 section: "Financial Information", inputType: "number", defaultVisible: false, defaultRequired: false },
  { fieldKey: "annualLeave",          label: "Annual Leave Pay",      section: "Financial Information", inputType: "number", defaultVisible: false, defaultRequired: false },
  { fieldKey: "retrenchment",         label: "Retrenchment",          section: "Financial Information", inputType: "number", defaultVisible: false, defaultRequired: false },
  { fieldKey: "ratePerDay",           label: "Rate Per Day",          section: "Financial Information", inputType: "number", defaultVisible: true,  defaultRequired: false },

  // Statutory Details
  { fieldKey: "pan",    label: "PAN Number",  section: "Statutory Details", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "aadhaar",label: "Aadhaar No.", section: "Statutory Details", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "pfUan",  label: "PF UAN",      section: "Statutory Details", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "esic",   label: "ESIC No.",    section: "Statutory Details", inputType: "text", defaultVisible: true,  defaultRequired: false },

  // Banking Information
  { fieldKey: "bankName",      label: "Bank Name",      section: "Banking Information", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "branchName",    label: "Branch Name",    section: "Banking Information", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "ifsc",          label: "IFSC Code",      section: "Banking Information", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "accountNumber", label: "Account Number", section: "Banking Information", inputType: "text", defaultVisible: true,  defaultRequired: false },

  // Address Information
  { fieldKey: "localAddress",    label: "Local Address",     section: "Address Information", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "state",           label: "State",             section: "Address Information", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "city",            label: "City",              section: "Address Information", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "pincode",         label: "Pincode",           section: "Address Information", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "permanentAddress", label: "Permanent Address", section: "Address Information", inputType: "text", defaultVisible: false, defaultRequired: false },
  { fieldKey: "permanentState",  label: "Permanent State",   section: "Address Information", inputType: "text", defaultVisible: false, defaultRequired: false },
  { fieldKey: "permanentCity",   label: "Permanent City",    section: "Address Information", inputType: "text", defaultVisible: false, defaultRequired: false },
  { fieldKey: "permanentPincode",label: "Permanent Pincode", section: "Address Information", inputType: "text", defaultVisible: false, defaultRequired: false },
  { fieldKey: "emergencyContactName",     label: "Emergency Contact Name",     section: "Address Information", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "emergencyContactRelation", label: "Emergency Contact Relation", section: "Address Information", inputType: "text", defaultVisible: false, defaultRequired: false },
  { fieldKey: "emergencyContactPhone",    label: "Emergency Contact Phone",    section: "Address Information", inputType: "text", defaultVisible: true,  defaultRequired: false },

  // Nominee Information
  { fieldKey: "nomineeName",     label: "Nominee Name",     section: "Nominee Information", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "nomineeAddress",  label: "Nominee Address",  section: "Nominee Information", inputType: "text", defaultVisible: false, defaultRequired: false },
  { fieldKey: "nomineeRelation", label: "Nominee Relation", section: "Nominee Information", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "nomineePhone",    label: "Nominee Phone",    section: "Nominee Information", inputType: "text", defaultVisible: false, defaultRequired: false },

  // Documents
  { fieldKey: "aadhaarPhoto",       label: "Aadhaar Photo",       section: "Documents", inputType: "file", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "passbook",           label: "Passbook",            section: "Documents", inputType: "file", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "photo",              label: "Photo",               section: "Documents", inputType: "file", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "education",          label: "Education Certificate",section: "Documents", inputType: "file", defaultVisible: false, defaultRequired: false },
  { fieldKey: "drivingLicense",     label: "Driving License",     section: "Documents", inputType: "file", defaultVisible: false, defaultRequired: false },
  { fieldKey: "policeClearance",    label: "Police Clearance",    section: "Documents", inputType: "file", defaultVisible: false, defaultRequired: false },
  { fieldKey: "medicalCertificate", label: "Medical Certificate", section: "Documents", inputType: "file", defaultVisible: false, defaultRequired: false },
  { fieldKey: "photoUrl",           label: "Photo URL",           section: "Documents", inputType: "file", defaultVisible: false, defaultRequired: false },
];

const LabourFieldConfigSchema = new mongoose.Schema({
  fieldKey:  { type: String, required: true },
  label:     { type: String, required: true },
  section:   { type: String, required: true },
  inputType: { type: String, required: true },
  visible:   { type: Boolean, default: true  },
  required:  { type: Boolean, default: false },
  order:     { type: Number,  default: 0     },
}, { _id: false });

const LabourFormConfigSchema = new mongoose.Schema(
  {
    organisationId: { type: String, required: true, unique: true },
    fields: [LabourFieldConfigSchema],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

LabourFormConfigSchema.statics.getFieldDefinitions = () => LABOUR_FIELD_DEFINITIONS;

LabourFormConfigSchema.statics.buildDefault = (organisationId) => ({
  organisationId,
  fields: LABOUR_FIELD_DEFINITIONS.map((f, i) => ({
    fieldKey:  f.fieldKey,
    label:     f.label,
    section:   f.section,
    inputType: f.inputType,
    visible:   f.defaultVisible,
    required:  f.defaultRequired,
    order:     i,
  })),
});

module.exports = {
  LabourFormConfig: mongoose.model("LabourFormConfig", LabourFormConfigSchema),
  LABOUR_FIELD_DEFINITIONS,
};
