const mongoose = require("mongoose");

const FIELD_DEFINITIONS = [
  // Personal Information
  { fieldKey: "firstName",     label: "First Name",       section: "Personal Information",  inputType: "text",   defaultVisible: true,  defaultRequired: true  },
  { fieldKey: "lastName",      label: "Last Name",        section: "Personal Information",  inputType: "text",   defaultVisible: true,  defaultRequired: true  },
  { fieldKey: "workEmail",     label: "Email Address",    section: "Personal Information",  inputType: "email",  defaultVisible: true,  defaultRequired: true  },
  { fieldKey: "phone",         label: "Mobile Number",    section: "Personal Information",  inputType: "text",   defaultVisible: true,  defaultRequired: false },
  { fieldKey: "gender",        label: "Gender",           section: "Personal Information",  inputType: "select", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "dateOfBirth",   label: "Date of Birth",   section: "Personal Information",  inputType: "date",   defaultVisible: true,  defaultRequired: false },
  { fieldKey: "bloodGroup",    label: "Blood Group",      section: "Personal Information",  inputType: "select", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "nationality",   label: "Nationality",      section: "Personal Information",  inputType: "text",   defaultVisible: true,  defaultRequired: false },
  { fieldKey: "maritalStatus", label: "Marital Status",   section: "Personal Information",  inputType: "select", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "personalEmail", label: "Personal Email",   section: "Personal Information",  inputType: "email",  defaultVisible: false, defaultRequired: false },
  { fieldKey: "altPhone",      label: "Alternate Phone",  section: "Personal Information",  inputType: "text",   defaultVisible: false, defaultRequired: false },

  // Employment Details
  { fieldKey: "employeeId",       label: "Employee ID",        section: "Employment Details", inputType: "text",   defaultVisible: true,  defaultRequired: false },
  { fieldKey: "department",       label: "Department",          section: "Employment Details", inputType: "select", defaultVisible: true,  defaultRequired: true  },
  { fieldKey: "designation",      label: "Designation",         section: "Employment Details", inputType: "text",   defaultVisible: true,  defaultRequired: true  },
  { fieldKey: "employmentType",   label: "Employment Type",     section: "Employment Details", inputType: "select", defaultVisible: true,  defaultRequired: true  },
  { fieldKey: "dateOfJoining",    label: "Date of Joining",     section: "Employment Details", inputType: "date",   defaultVisible: true,  defaultRequired: true  },
  { fieldKey: "workLocation",     label: "Work Location",       section: "Employment Details", inputType: "text",   defaultVisible: true,  defaultRequired: false },
  { fieldKey: "status",           label: "Status",              section: "Employment Details", inputType: "select", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "probationPeriod",  label: "Probation Period (days)", section: "Employment Details", inputType: "number", defaultVisible: true, defaultRequired: false },
  { fieldKey: "confirmationDate", label: "Confirmation Date",   section: "Employment Details", inputType: "date",   defaultVisible: false, defaultRequired: false },
  { fieldKey: "noticePeriod",     label: "Notice Period (days)", section: "Employment Details", inputType: "number", defaultVisible: true, defaultRequired: false },
  { fieldKey: "reportingManager", label: "Reporting Manager",   section: "Employment Details", inputType: "text",   defaultVisible: true,  defaultRequired: false },

  // Financial Information
  { fieldKey: "basicSalary",          label: "Basic Pay",               section: "Financial Information", inputType: "number", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "hra",                  label: "House Rent Allowance",    section: "Financial Information", inputType: "number", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "da",                   label: "Dearness Allowance",      section: "Financial Information", inputType: "number", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "conveyanceAllowance",  label: "Conveyance Allowance",    section: "Financial Information", inputType: "number", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "medicalAllowance",     label: "Medical Allowance",       section: "Financial Information", inputType: "number", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "statutoryBonus",       label: "Statutory Bonus",         section: "Financial Information", inputType: "number", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "retrenchmentAllowance",label: "Retrenchment Allowance",  section: "Financial Information", inputType: "number", defaultVisible: false, defaultRequired: false },
  { fieldKey: "flexiBalance",         label: "Flexi Balance",           section: "Financial Information", inputType: "number", defaultVisible: false, defaultRequired: false },
  { fieldKey: "ctc",                  label: "CTC (Annual)",            section: "Financial Information", inputType: "number", defaultVisible: true,  defaultRequired: false },

  // Statutory Details
  { fieldKey: "panNumber",    label: "PAN Number",       section: "Statutory Details", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "aadharNumber", label: "Aadhar Number",    section: "Statutory Details", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "uanNumber",    label: "UAN Number",       section: "Statutory Details", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "esiNumber",    label: "ESI Number",       section: "Statutory Details", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "pfNumber",     label: "PF Account Number",section: "Statutory Details", inputType: "text", defaultVisible: false, defaultRequired: false },
  { fieldKey: "passportNumber",label: "Passport Number", section: "Statutory Details", inputType: "text", defaultVisible: false, defaultRequired: false },

  // Banking Information
  { fieldKey: "bankName",      label: "Bank Name",      section: "Banking Information", inputType: "text",   defaultVisible: true,  defaultRequired: false },
  { fieldKey: "accountNumber", label: "Account Number", section: "Banking Information", inputType: "text",   defaultVisible: true,  defaultRequired: false },
  { fieldKey: "ifscCode",      label: "IFSC Code",      section: "Banking Information", inputType: "text",   defaultVisible: true,  defaultRequired: false },
  { fieldKey: "accountType",   label: "Account Type",   section: "Banking Information", inputType: "select", defaultVisible: true,  defaultRequired: false },

  // Address & Contact
  { fieldKey: "address",      label: "Address Line 1",  section: "Address & Contact", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "addressLine2", label: "Address Line 2",  section: "Address & Contact", inputType: "text", defaultVisible: false, defaultRequired: false },
  { fieldKey: "city",         label: "City",            section: "Address & Contact", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "state",        label: "State",           section: "Address & Contact", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "pincode",      label: "Pincode",         section: "Address & Contact", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "country",      label: "Country",         section: "Address & Contact", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "emergencyContactName",     label: "Emergency Contact Name",     section: "Address & Contact", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "emergencyContactPhone",    label: "Emergency Contact Phone",    section: "Address & Contact", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "emergencyContactRelation", label: "Emergency Contact Relation", section: "Address & Contact", inputType: "text", defaultVisible: false, defaultRequired: false },

  // Nominee Details
  { fieldKey: "nomineeName",      label: "Nominee Name",      section: "Nominee Details", inputType: "text",   defaultVisible: true,  defaultRequired: false },
  { fieldKey: "nomineeRelation",  label: "Relation",          section: "Nominee Details", inputType: "text",   defaultVisible: true,  defaultRequired: false },
  { fieldKey: "nomineeDob",       label: "Nominee DOB",       section: "Nominee Details", inputType: "date",   defaultVisible: true,  defaultRequired: false },
  { fieldKey: "nomineeShare",     label: "Share %",           section: "Nominee Details", inputType: "number", defaultVisible: true,  defaultRequired: false },

  // Family Details
  { fieldKey: "fatherName",       label: "Father's Name",     section: "Family Details", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "motherName",       label: "Mother's Name",     section: "Family Details", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "spouseName",       label: "Spouse Name",       section: "Family Details", inputType: "text", defaultVisible: false, defaultRequired: false },
  { fieldKey: "numberOfChildren", label: "Number of Children",section: "Family Details", inputType: "number",defaultVisible: false, defaultRequired: false },

  // Education Details
  { fieldKey: "highestQualification", label: "Highest Qualification", section: "Education Details", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "university",           label: "University/Board",      section: "Education Details", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "yearOfPassing",        label: "Year of Passing",       section: "Education Details", inputType: "text", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "percentage",           label: "Percentage/Grade",      section: "Education Details", inputType: "text", defaultVisible: false, defaultRequired: false },

  // Professional Details
  { fieldKey: "totalExperience",    label: "Total Experience (yrs)",  section: "Professional Details", inputType: "number", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "prevEmployer",       label: "Previous Employer",       section: "Professional Details", inputType: "text",   defaultVisible: true,  defaultRequired: false },
  { fieldKey: "prevDesignation",    label: "Previous Designation",    section: "Professional Details", inputType: "text",   defaultVisible: false, defaultRequired: false },
  { fieldKey: "skills",             label: "Skills",                  section: "Professional Details", inputType: "text",   defaultVisible: true,  defaultRequired: false },

  // Documents
  { fieldKey: "photoUrl",        label: "Employee Photo",   section: "Documents", inputType: "file", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "aadharDocUrl",    label: "Aadhar Card",      section: "Documents", inputType: "file", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "passbookUrl",     label: "Bank Passbook",    section: "Documents", inputType: "file", defaultVisible: true,  defaultRequired: false },
  { fieldKey: "panDocUrl",       label: "PAN Card",         section: "Documents", inputType: "file", defaultVisible: false, defaultRequired: false },
  { fieldKey: "offerLetterUrl",  label: "Offer Letter",     section: "Documents", inputType: "file", defaultVisible: false, defaultRequired: false },
];

const FieldConfigSchema = new mongoose.Schema({
  fieldKey:  { type: String, required: true },
  label:     { type: String, required: true },
  section:   { type: String, required: true },
  inputType: { type: String, required: true },
  visible:   { type: Boolean, default: true  },
  required:  { type: Boolean, default: false },
  order:     { type: Number,  default: 0     },
}, { _id: false });

const EmployeeFormConfigSchema = new mongoose.Schema(
  {
    organisationId: { type: String, required: true, unique: true },
    fields: [FieldConfigSchema],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

EmployeeFormConfigSchema.statics.getFieldDefinitions = () => FIELD_DEFINITIONS;

EmployeeFormConfigSchema.statics.buildDefault = (organisationId) => ({
  organisationId,
  fields: FIELD_DEFINITIONS.map((f, i) => ({
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
  EmployeeFormConfig: mongoose.model("EmployeeFormConfig", EmployeeFormConfigSchema),
  FIELD_DEFINITIONS,
};
