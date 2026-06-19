const mongoose = require("mongoose");
const { Schema } = mongoose;

const DocumentSchema = new Schema(
  {
    organisationId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: "all",
    },
    owner: {
      type: String,
      default: "All Employees",
    },
    size: {
      type: String,
      default: "0 Bytes",
    },
    type: {
      type: String,
      default: "pdf",
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", DocumentSchema);
