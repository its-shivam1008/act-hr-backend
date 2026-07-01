const mongoose = require("mongoose");
const { Schema } = mongoose;
const OID = Schema.Types.ObjectId;

const OfferSchema = new Schema(
  {
    organisationId: { type: String, required: true, index: true },
    offerId:        { type: String, unique: true },

    // Linked
    candidate:        { type: OID, ref: "Candidate", required: true },
    candidateName:    String,
    candidateEmail:   String,
    requisition:      { type: OID, ref: "JobRequisition" },
    requisitionTitle: String,

    // Role & Grade (auto-populated from requisition)
    designation:     { type: OID, ref: "Designation", default: null },
    designationName: String,
    grade:           { type: OID, ref: "Grade", default: null },
    gradeName:       String,
    department:      { type: OID, ref: "Department", default: null },
    departmentName:  String,
    location:        { type: OID, ref: "Location", default: null },
    locationName:    String,

    // CTC components (auto-populated, editable)
    basicSalary:           Number,
    hra:                   Number,
    da:                    Number,
    conveyanceAllowance:   Number,
    medicalAllowance:      Number,
    specialAllowance:      Number,
    grossMonthly:          Number,
    annualCTC:             Number,

    // Terms
    joiningDate:     Date,
    probationMonths: { type: Number, default: 6 },
    noticePeriod:    { type: Number, default: 90 },  // days

    // Offer letter
    offerLetterUrl:  String,
    offerText:       String,   // generated letter text

    // Expiry
    offerExpiry:     Date,

    // Workflow
    status: {
      type: String,
      enum: ["Draft","Sent","Accepted","Declined","Revoked","Lapsed","Onboarding"],
      default: "Draft",
    },
    sentAt:      Date,
    respondedAt: Date,
    declineReason: String,

    // After acceptance → creates onboarding record
    onboardingId: { type: OID, ref: "Onboarding", default: null },

    notes:     String,
    createdBy: { type: OID, ref: "User" },
  },
  { timestamps: true }
);

OfferSchema.pre("save", async function () {
  if (this.isNew && !this.offerId) {
    let count = await this.constructor.countDocuments({});
    let idCandidate;
    let exists = true;
    while (exists) {
      count++;
      idCandidate = `OFR-${String(count).padStart(4, "0")}`;
      exists = await this.constructor.exists({ offerId: idCandidate });
    }
    this.offerId = idCandidate;
  }
});

module.exports = mongoose.model("Offer", OfferSchema);
