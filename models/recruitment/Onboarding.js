const mongoose = require("mongoose");
const { Schema } = mongoose;
const OID = Schema.Types.ObjectId;

const ChecklistItemSchema = new Schema({
  task:        { type: String, required: true },
  category:    { type: String, enum: ["Documents","System Access","Induction","Assets","Others"], default: "Documents" },
  dueDate:     Date,
  completedAt: Date,
  status:      { type: String, enum: ["Pending","In Progress","Completed","Skipped"], default: "Pending" },
  assignedTo:  String,
  notes:       String,
}, { _id: true });

const OnboardingSchema = new Schema(
  {
    organisationId: { type: String, required: true, index: true },
    onboardingId:   { type: String, unique: true },

    // Linked
    offer:            { type: OID, ref: "Offer", required: true },
    candidate:        { type: OID, ref: "Candidate" },
    candidateName:    String,
    candidateEmail:   String,
    requisitionTitle: String,

    // New hire details (filled from offer, editable)
    joiningDate:     Date,
    designation:     { type: OID, ref: "Designation", default: null },
    designationName: String,
    grade:           { type: OID, ref: "Grade", default: null },
    gradeName:       String,
    department:      { type: OID, ref: "Department", default: null },
    departmentName:  String,
    location:        { type: OID, ref: "Location", default: null },
    locationName:    String,
    reportingManager:String,
    annualCTC:       Number,

    // Self-service: new hire fills personal details
    selfServiceStatus:  { type: String, enum: ["Not Sent","Pending","Completed"], default: "Not Sent" },
    selfServiceToken:   String,
    selfServiceFilledAt:Date,
    selfServiceData:    Schema.Types.Mixed,  // all personal details submitted by new hire

    // Checklist (document collection, system access, induction, asset allocation)
    checklist: [ChecklistItemSchema],

    // Overall progress
    status: {
      type: String,
      enum: ["Pending","In Progress","Completed","Cancelled"],
      default: "Pending",
    },
    completedAt: Date,

    // INTERCONNECTION: when completed → linked Employee is made Active
    employeeId:  { type: OID, ref: "Employee", default: null },
    activatedAt: Date,

    notes:     String,
    createdBy: { type: OID, ref: "User" },
  },
  { timestamps: true }
);

OnboardingSchema.pre("save", async function () {
  if (this.isNew && !this.onboardingId) {
    let count = await this.constructor.countDocuments({});
    let idCandidate;
    let exists = true;
    while (exists) {
      count++;
      idCandidate = `ONB-${String(count).padStart(4, "0")}`;
      exists = await this.constructor.exists({ onboardingId: idCandidate });
    }
    this.onboardingId = idCandidate;
  }
  // Auto-set default checklist when new record created
  if (this.isNew && (!this.checklist || this.checklist.length === 0)) {
    this.checklist = [
      { task: "Collect original educational certificates", category: "Documents", status: "Pending" },
      { task: "Collect identity proof (Aadhar/Passport)", category: "Documents", status: "Pending" },
      { task: "Collect address proof", category: "Documents", status: "Pending" },
      { task: "Collect bank account details & passbook", category: "Documents", status: "Pending" },
      { task: "Collect signed offer letter", category: "Documents", status: "Pending" },
      { task: "Create email account", category: "System Access", status: "Pending" },
      { task: "Assign ERP/HRMS credentials", category: "System Access", status: "Pending" },
      { task: "Setup laptop/workstation", category: "Assets", status: "Pending" },
      { task: "Induction session: company overview", category: "Induction", status: "Pending" },
      { task: "Induction session: policies and procedures", category: "Induction", status: "Pending" },
      { task: "Department-specific orientation", category: "Induction", status: "Pending" },
      { task: "Assign ID card and access card", category: "Assets", status: "Pending" },
    ];
  }
});

module.exports = mongoose.model("Onboarding", OnboardingSchema);
