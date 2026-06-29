const mongoose = require("mongoose");
const { Schema } = mongoose;
const OID = Schema.Types.ObjectId;

const CandidateSchema = new Schema(
  {
    organisationId: { type: String, required: true, index: true },
    candidateId:    { type: String, unique: true },

    // Personal
    firstName:   { type: String, required: true },
    lastName:    String,
    email:       { type: String, lowercase: true, trim: true },
    phone:       String,
    gender:      String,
    dateOfBirth: Date,
    currentCity: String,
    currentState:String,

    // Professional
    totalExperience:   Number,   // years
    currentEmployer:   String,
    currentDesignation:String,
    currentCTC:        Number,
    expectedCTC:       Number,
    noticePeriod:      Number,   // days
    skills:            [String],
    highestQualification: String,
    university:        String,
    yearOfPassing:     String,

    // Source
    source:    { type: String, enum: ["Referral","Job Portal","LinkedIn","Agency","Walk-In","Campus","Other"], default: "Job Portal" },
    referredBy:String,
    sourceNotes:String,

    // Resume / Docs
    resumeUrl: String,
    photoUrl:  String,

    // Applied Requisitions
    applications: [
      {
        requisition:     { type: OID, ref: "JobRequisition" },
        requisitionId:   String,
        requisitionTitle:String,
        appliedAt:       { type: Date, default: Date.now },
        stage: {
          type: String,
          enum: ["Applied","Screening","Shortlisted","Interview","Offer","Hired","Rejected","Withdrawn"],
          default: "Applied",
        },
        rejectionReason: String,
      },
    ],

    // Overall status
    status: {
      type: String,
      enum: ["Active","Hired","Rejected","Withdrawn","Blacklisted"],
      default: "Active",
    },

    notes: String,
    tags:  [String],
    createdBy: { type: OID, ref: "User" },
  },
  { timestamps: true }
);

CandidateSchema.pre("save", async function () {
  if (this.isNew && !this.candidateId) {
    let count = await this.constructor.countDocuments({});
    let idCandidate;
    let exists = true;
    while (exists) {
      count++;
      idCandidate = `CAN-${String(count).padStart(4, "0")}`;
      exists = await this.constructor.exists({ candidateId: idCandidate });
    }
    this.candidateId = idCandidate;
  }
});

module.exports = mongoose.model("Candidate", CandidateSchema);
