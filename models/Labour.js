const mongoose = require("mongoose");
const { Schema } = mongoose;
const OID = Schema.Types.ObjectId;

const LabourSchema = new mongoose.Schema(
  {
    organisationId: { type: String, required: true, index: true },
    labourId: { type: String, sparse: true },

    // ── Personal Information ──────────────────────────────────────────────
    firstName:          String,
    lastName:           String,
    email:              { type: String, lowercase: true, trim: true },
    mobile:             String,
    sex:                { type: String, enum: ["Male", "Female", "Other", "Prefer not to say"] },
    dateOfBirth:        Date,
    nationality:        String,
    identificationMark: String,
    medicalCondition:   String,
    bloodGroup:         { type: String, enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
    allergies:          String,

    // ── Employment Details — ObjectId refs to master data ────────────────────
    dateOfJoining:      Date,
    climsId:            String,
    formA:              String,
    locationId:         { type: OID, ref: "Location",      default: null },
    locationName:       String,   // denormalised
    employmentType:     { type: OID, ref: "EmploymentType", default: null },
    employmentTypeName: String,
    agencyId:           { type: OID, ref: "Agency",         default: null },
    agencyName:         String,
    department:         { type: OID, ref: "Department",     default: null },
    departmentName:     String,
    designation:        { type: OID, ref: "Designation",    default: null },
    designationName:    String,
    complianceZone:     { type: OID, ref: "ComplianceZone", default: null },
    complianceZoneName: String,
    complianceSkillLevel:     { type: OID, ref: "SkillLevel", default: null },
    complianceSkillLevelName: String,
    status: {
      type: String,
      enum: ["Active", "On Leave", "Terminated", "Resigned"],
      default: "Active",
    },

    // ── Skill Information ─────────────────────────────────────────────────
    skillLevel:         { type: OID, ref: "SkillLevel", default: null },
    skillLevelName:     String,
    certifications:      String,
    previousExperience:  String,

    // ── Safety Information ────────────────────────────────────────────────
    safetyTraining:     String,
    safetyTrainingDate: Date,

    // ── Work Preferences ──────────────────────────────────────────────────
    preferredShift:       String,
    overtimeAvailability: { type: String, enum: ["Yes", "No"] },
    transportationMode:   String,

    // ── Financial Information ─────────────────────────────────────────────
    basicPay:              Number,
    hra:                   Number,
    da:                    Number,
    convenienceAllowance:  Number,
    foodAllowance:         Number,
    siteAllowance:         Number,
    monthlyRate:           Number,
    hourlyRate:            Number,
    medical:               Number,
    bonus:                 Number,
    annualLeave:           Number,
    retrenchment:          Number,
    ratePerDay:            Number,

    // ── Statutory Details ─────────────────────────────────────────────────
    pan:    String,
    aadhaar: String,
    pfUan:   String,
    esic:    String,

    // ── Banking Information ───────────────────────────────────────────────
    bankName:      String,
    branchName:    String,
    ifsc:          String,
    accountNumber: String,

    // ── Address Information ───────────────────────────────────────────────
    localAddress:      String,
    state:             String,
    city:              String,
    pincode:           String,
    permanentAddress:  String,
    permanentState:    String,
    permanentCity:     String,
    permanentPincode:  String,

    // ── Emergency Contact ─────────────────────────────────────────────────
    emergencyContactName:     String,
    emergencyContactRelation: String,
    emergencyContactPhone:    String,

    // ── Nominee Information ───────────────────────────────────────────────
    nomineeName:     String,
    nomineeAddress:  String,
    nomineeRelation: String,
    nomineePhone:    String,

    // ── Documents ─────────────────────────────────────────────────────────
    aadhaarPhoto:       String,
    passbook:           String,
    photo:              String,
    education:          String,
    // Labour-specific docs
    drivingLicense:     String,
    policeClearance:    String,
    medicalCertificate: String,
    photoUrl:           String,

    // ── Family Members (Group Health Insurance) ───────────────────────────────
    familyMembers: [
      {
        name:         String,
        contactNo:    String,
        dob:          Date,
        age:          Number,
        gender:       { type: String, enum: ["Male", "Female", "Other"] },
        relationship: String,
      },
    ],

    // ── Education ─────────────────────────────────────────────────────────────
    basicEducation: [
      {
        education: String,
        board:     String,
        marks:     String,
        year:      String,
        stream:    String,
        grade:     String,
      },
    ],
    technicalEducation: [
      {
        education: String,
        board:     String,
        marks:     String,
        year:      String,
        stream:    String,
        grade:     String,
      },
    ],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Auto-generate labourId
LabourSchema.pre("save", async function () {
  if (this.isNew && !this.labourId) {
    const count = await this.constructor.countDocuments({ organisationId: this.organisationId });
    this.labourId = `LAB-${String(count + 1).padStart(4, "0")}`;
  }
});

module.exports = mongoose.model("Labour", LabourSchema);
