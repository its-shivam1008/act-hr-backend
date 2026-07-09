const mongoose = require('mongoose');

const HolidaySchema = new mongoose.Schema(
  {
    organisationId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    date: { type: Date, required: true },
    type: { type: String, default: 'Public Holiday' }, // e.g., 'National', 'Regional', 'Public Holiday'
    locations: [{ type: String }], // If empty, applies to all locations. Otherwise, applies only to these.
    month: { type: Number },
    year: { type: Number },
  },
  { timestamps: true }
);

// Ensure a holiday isn't added twice for the same organization and date
HolidaySchema.index({ organisationId: 1, date: 1 }, { unique: true });

// Pre-save to auto-fill month and year
HolidaySchema.pre('save', function (next) {
  if (this.date) {
    this.month = this.date.getMonth();
    this.year = this.date.getFullYear();
  }
  next();
});

module.exports = mongoose.model('Holiday', HolidaySchema);
