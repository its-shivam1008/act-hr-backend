const mongoose = require("mongoose");

const EmployeeSchema = new mongoose.Schema(
  {
    organisationId: { type: String, required: true, index: true },
    employeeId: { type: String, sparse: true },

    // Personal
    firstName: String,
    lastName: String,
    workEmail: { type: String, lowercase: true, trim: true },
    personalEmail: { type: String, lowercase: true, trim: true },
    phone: String,
    altPhone: String,
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say"],
    },
    dateOfBirth: Date,
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    nationality: String,
    maritalStatus: String,

    // Employment
    department: String,
    designation: String,
    employmentType: {
      type: String,
      enum: ["Full-Time", "Part-Time", "Contract", "Intern", "Remote"],
    },
    dateOfJoining: Date,
    confirmationDate: Date,
    dateOfLeaving: Date,
    workLocation: String,
    reportingManager: String,
    status: {
      type: String,
      enum: ["Active", "On Leave", "Terminated", "Resigned"],
      default: "Active",
    },
    probationPeriod: Number,
    noticePeriod: Number,
    skills: String,

    // Financial
    basicSalary: Number,
    hra: Number,
    da: Number,
    conveyanceAllowance: Number,
    medicalAllowance: Number,
    statutoryBonus: Number,
    retrenchmentAllowance: Number,
    flexiBalance: Number,
    ctc: Number,

    // Statutory
    panNumber: String,
    aadharNumber: String,
    uanNumber: String,
    esiNumber: String,
    pfNumber: String,
    passportNumber: String,

    // Banking
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    accountType: { type: String, enum: ["Savings", "Current"] },

    // Address
    address: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: "India" },
    emergencyContactName: String,
    emergencyContactPhone: String,
    emergencyContactRelation: String,

    // Nominee
    nomineeName: String,
    nomineeRelation: String,
    nomineeDob: Date,
    nomineeShare: Number,

    // Family (simple fields)
    fatherName: String,
    motherName: String,
    spouseName: String,
    numberOfChildren: Number,

    // Family members table (Group Health Insurance)
    familyMembers: [
      {
        name: String,
        contactNo: String,
        dob: Date,
        age: Number,
        gender: { type: String, enum: ["Male", "Female", "Other"] },
        relationship: String,
      },
    ],

    // Education tables
    basicEducation: [
      {
        education: String,
        board: String,
        marks: String,
        year: String,
        stream: String,
        grade: String,
      },
    ],
    technicalEducation: [
      {
        education: String,
        board: String,
        marks: String,
        year: String,
        stream: String,
        grade: String,
      },
    ],

    // Professional
    totalExperience: Number,
    prevEmployer: String,
    prevDesignation: String,
    skills: String,

    // Documents
    photoUrl: String,
    aadharDocUrl: String,
    passbookUrl: String,
    panDocUrl: String,
    offerLetterUrl: String,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Auto-generate EMP-0001 style ID
EmployeeSchema.pre("save", async function () {
  if (this.isNew && !this.employeeId) {
    const count = await this.constructor.countDocuments({
      organisationId: this.organisationId,
    });
    this.employeeId = `EMP-${String(count + 1).padStart(4, "0")}`;
  }
});

module.exports = mongoose.model("Employee", EmployeeSchema);
