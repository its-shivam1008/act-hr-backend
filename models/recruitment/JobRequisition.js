const mongoose = require("mongoose");
const { Schema } = mongoose;
const OID = Schema.Types.ObjectId;

const JobRequisitionSchema = new Schema(
  {
    organisationId: { type: String, required: true, index: true },
    requisitionId:  { type: String, unique: true },

    // Role details
    title:          { type: String, required: true },
    department:     { type: OID, ref: "Department", default: null },
    departmentName: String,
    designation:    { type: OID, ref: "Designation", default: null },
    designationName:String,
    grade:          { type: OID, ref: "Grade", default: null },
    gradeName:      String,
    location:       { type: OID, ref: "Location", default: null },
    locationName:   String,

    // Headcount & Budget
    positions:    { type: Number, default: 1 },
    ctcBandMin:   Number,
    ctcBandMax:   Number,
    priority:     { type: String, enum: ["Low","Medium","High","Critical"], default: "Medium" },
    hiringType:   { type: String, enum: ["New","Replacement","Contract"], default: "New" },

    // Timeline
    targetDate:   Date,

    // JD
    jobDescription: String,
    skills:         [String],
    experience:     String,
    qualification:  String,

    // Workflow
    requestor:      { type: OID, ref: "User", default: null },
    requestorName:  String,
    approver:       { type: OID, ref: "User", default: null },
    approverName:   String,
    status: {
      type: String,
      enum: ["Draft","Pending Approval","Approved","Rejected","Open","Closed","On Hold"],
      default: "Draft",
    },
    approvalComments: String,
    approvedAt:       Date,
    postedAt:         Date,
    closedAt:         Date,

    reason: String,
    notes:  String,
  },
  { timestamps: true }
);

// Auto-generate requisitionId
JobRequisitionSchema.pre("save", async function () {
  if (this.isNew && !this.requisitionId) {
    let count = await this.constructor.countDocuments({});
    let idCandidate;
    let exists = true;
    while (exists) {
      count++;
      idCandidate = `REQ-${String(count).padStart(4, "0")}`;
      exists = await this.constructor.exists({ requisitionId: idCandidate });
    }
    this.requisitionId = idCandidate;
  }
});

module.exports = mongoose.model("JobRequisition", JobRequisitionSchema);
