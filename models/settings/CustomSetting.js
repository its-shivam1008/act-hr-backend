const mongoose = require("mongoose");
const { Schema } = mongoose;

const CustomSettingSchema = new Schema(
  {
    organisationId: {
      type: String,
      required: true,
      default: "default_org",
    },
    key: {
      type: String,
      required: [true, "Setting key is required"],
      unique: true,
      trim: true,
    },
    value: {
      type: String,
      required: [true, "Setting value is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      trim: true,
      default: "General",
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CustomSetting", CustomSettingSchema);
