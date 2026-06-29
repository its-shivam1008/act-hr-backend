const mongoose = require("mongoose");
const { Schema } = mongoose;
const OID = Schema.Types.ObjectId;

const CompetencySchema = new Schema({
  competency: { type: String, required: true },
  rating:     { type: Number, min: 1, max: 5 },
  comments:   String,
}, { _id: false });

const PanelMemberSchema = new Schema({
  user:     { type: OID, ref: "User" },
  userName: String,
  role:     String,  // e.g. "Technical Lead", "HR Manager"
  feedback: {
    competencies: [CompetencySchema],
    averageScore: Number,
    recommendation: { type: String, enum: ["Proceed","Hold","Reject","Strong Hire","","—"], default: "" },
    overallComments:String,
    submittedAt:    Date,
  },
}, { _id: false });

const InterviewSchema = new Schema(
  {
    organisationId: { type: String, required: true, index: true },
    interviewId:    { type: String, unique: true },

    // Linked entities
    candidate:        { type: OID, ref: "Candidate", required: true },
    candidateName:    String,
    candidateEmail:   String,
    requisition:      { type: OID, ref: "JobRequisition" },
    requisitionTitle: String,

    // Schedule
    round:       { type: Number, default: 1 },
    roundLabel:  { type: String, default: "Technical Round" },  // e.g. HR, Technical, Final
    scheduledAt: { type: Date, required: true },
    duration:    { type: Number, default: 60 },    // minutes
    mode:        { type: String, enum: ["In-Person","Video Call","Phone","Panel"], default: "In-Person" },
    location:    String,   // room / VC link
    meetLink:    String,

    // Panel
    panelMembers: [PanelMemberSchema],

    // Status
    status: {
      type: String,
      enum: ["Scheduled","In Progress","Completed","Cancelled","No Show","Rescheduled"],
      default: "Scheduled",
    },

    // Aggregate score (auto-computed when all panel submits)
    aggregateScore:  Number,
    finalVerdict:    { type: String, enum: ["Proceed","Reject","Hold","","—"], default: "" },
    overallComments: String,

    notes:     String,
    createdBy: { type: OID, ref: "User" },
  },
  { timestamps: true }
);

InterviewSchema.pre("save", async function () {
  if (this.isNew && !this.interviewId) {
    let count = await this.constructor.countDocuments({});
    let idCandidate;
    let exists = true;
    while (exists) {
      count++;
      idCandidate = `INT-${String(count).padStart(4, "0")}`;
      exists = await this.constructor.exists({ interviewId: idCandidate });
    }
    this.interviewId = idCandidate;
  }
  // Auto-compute aggregate score if all panels have submitted
  const submitted = this.panelMembers.filter(p => p.feedback?.averageScore != null);
  if (submitted.length > 0) {
    this.aggregateScore = submitted.reduce((s, p) => s + p.feedback.averageScore, 0) / submitted.length;
  }
});

module.exports = mongoose.model("Interview", InterviewSchema);
