const mongoose = require("mongoose");
const { Schema } = mongoose;

const ComponentSchema = new Schema(
  {
    name:       { type: String, required: true },
    code:       { type: String, required: true },
    type:       { type: String, enum: ["Fixed", "Formula", "Percentage", "Balancing"], required: true },
    category:   { type: String, enum: ["Basic", "HRA", "DA", "Medical", "Special", "Conveyance", "Other"], default: "Other" },
    value:      { type: Number, default: 0 },     // Fixed amount or percentage base
    formula:    { type: String, default: "" },    // e.g. "50% of CTC"
    taxable:    { type: Boolean, default: true },
    kind:       { type: String, enum: ["Earning", "Deduction"], default: "Earning" },
  },
  { _id: true }
);

const SalaryStructureSchema = new Schema(
  {
    organisationId: { type: String, required: true, index: true },
    name:           { type: String, required: true },
    code:           { type: String, required: true },
    description:    { type: String, default: "" },
    ctc:            { type: Number, default: 0 },        // Annual CTC if fixed; 0 means employee-specific
    status:         { type: String, enum: ["Active", "Draft", "Inactive"], default: "Draft" },
    components:     { type: [ComponentSchema], default: [] },
    employeeCount:  { type: Number, default: 0 },        // Informational; not auto-calculated
  },
  { timestamps: true }
);

// Compound unique index: same org cannot have duplicate structure codes
SalaryStructureSchema.index({ organisationId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model("SalaryStructure", SalaryStructureSchema);
