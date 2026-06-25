const mongoose  = require("mongoose");
const bcrypt    = require("bcryptjs");
const { Schema } = mongoose;
const OID = Schema.Types.ObjectId;

const EmployeeSchema = new Schema(
  {
    // ── Org scope ─────────────────────────────────────────────────────────
    organisationId: { type: String, required: true, index: true },

    // ── Personal Information ──────────────────────────────────────────────
    personalInfo: {
      employeeId:    { type: String, sparse: true },
      firstName:     String,
      lastName:      String,
      workEmail:     { type: String, lowercase: true, trim: true },
      phone:         String,
      gender:        String,
      dateOfBirth:   Date,
      bloodGroup:    String,
      nationality:   String,
      maritalStatus: String,
      personalEmail: { type: String, lowercase: true, trim: true },
      altPhone:      String,
    },

    // ── Employment (ObjectId refs to master data) ─────────────────────────
    employment: {
      department:               { type: OID, ref: "Department",     default: null },
      departmentName:           String,
      designation:              { type: OID, ref: "Designation",    default: null },
      designationName:          String,
      employmentType:           { type: OID, ref: "EmploymentType", default: null },
      employmentTypeName:       String,
      dateOfJoining:            Date,
      workLocation:             { type: OID, ref: "Location",       default: null },
      workLocationName:         String,
      complianceZone:           { type: OID, ref: "ComplianceZone", default: null },
      complianceZoneName:       String,
      complianceSkillLevel:     { type: OID, ref: "SkillLevel",     default: null },
      complianceSkillLevelName: String,
      skillLevel:               { type: OID, ref: "SkillLevel",     default: null },
      skillLevelName:           String,
      grade:                    { type: OID, ref: "Grade",          default: null },
      gradeName:                String,
      status: {
        type: String,
        enum: ["Active","On Leave","Terminated","Resigned"],
        default: "Active",
      },
      probationPeriod:  Number,
      noticePeriod:     Number,
      reportingManager: String,
      confirmationDate: Date,
      dateOfLeaving:    Date,
    },

    // ── Financial Information ─────────────────────────────────────────────
    financial: {
      basicSalary:           Number,
      hra:                   Number,
      da:                    Number,
      conveyanceAllowance:   Number,
      medicalAllowance:      Number,
      statutoryBonus:        Number,
      ctc:                   Number,
      retrenchmentAllowance: Number,
      flexiBalance:          Number,
    },

    // ── Statutory Details ─────────────────────────────────────────────────
    statutory: {
      panNumber:      String,
      aadharNumber:   String,
      uanNumber:      String,
      esiNumber:      String,
      pfNumber:       String,
      passportNumber: String,
    },

    // ── Banking Information ───────────────────────────────────────────────
    banking: {
      bankName:      String,
      accountNumber: String,
      ifscCode:      String,
      accountType:   String,
    },

    // ── Address & Emergency Contact ───────────────────────────────────────
    address: {
      address:                  String,
      addressLine2:             String,
      city:                     String,
      state:                    String,
      pincode:                  String,
      country:                  { type: String, default: "India" },
      emergencyContactName:     String,
      emergencyContactPhone:    String,
      emergencyContactRelation: String,
    },

    // ── Nominee Details ───────────────────────────────────────────────────
    nominee: {
      nomineeName:     String,
      nomineeRelation: String,
      nomineeDob:      Date,
      nomineeShare:    Number,
    },

    // ── Family Details ────────────────────────────────────────────────────
    family: {
      fatherName:       String,
      motherName:       String,
      spouseName:       String,
      numberOfChildren: Number,
    },

    // ── Education Details ─────────────────────────────────────────────────
    education: {
      highestQualification: String,
      university:           String,
      yearOfPassing:        String,
      percentage:           String,
    },

    // ── Professional Details ──────────────────────────────────────────────
    professional: {
      totalExperience: Number,
      prevEmployer:    String,
      prevDesignation: String,
      skills:          String,
    },

    // ── Documents ─────────────────────────────────────────────────────────
    documents: {
      photoUrl:       String,
      aadharDocUrl:   String,
      passbookUrl:    String,
      panDocUrl:      String,
      offerLetterUrl: String,
    },

    // ── Dynamic table arrays ──────────────────────────────────────────────
    familyMembers: [
      {
        name: String, contactNo: String, dob: Date,
        age: Number, gender: String, relationship: String,
      },
    ],
    basicEducation: [
      { education: String, board: String, marks: String, year: String, stream: String, grade: String },
    ],
    technicalEducation: [
      { education: String, board: String, marks: String, year: String, stream: String, grade: String },
    ],

    // ── Portal auth ───────────────────────────────────────────────────────
    password:          { type: String, select: false },
    passwordChangedAt: Date,
    createdBy:         { type: OID, ref: "User" },
  },
  { timestamps: true }
);

EmployeeSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

EmployeeSchema.pre("save", async function () {
  const empId = this.personalInfo?.employeeId;
  if (this.isNew) {
    if (!empId) {
      const count = await this.constructor.countDocuments({ organisationId: this.organisationId });
      const generated = `EMP-${String(count + 1).padStart(4, "0")}`;
      if (!this.personalInfo) this.personalInfo = {};
      this.personalInfo.employeeId = generated;
    }
    if (!this.password) {
      this.password = await bcrypt.hash(this.personalInfo.employeeId, 10);
    }
  } else if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
    this.passwordChangedAt = new Date();
  }
});

module.exports = mongoose.model("Employee", EmployeeSchema);
