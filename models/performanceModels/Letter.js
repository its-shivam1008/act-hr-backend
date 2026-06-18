const mongoose = require('mongoose');

const letterTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, enum: ['General', 'Recruitment', 'Performance', 'Disciplinary', 'Exit'], default: 'General' },
  content: { type: String, required: true },
  usedCount: { type: Number, default: 0 },
}, { timestamps: true });

const issuedLetterSchema = new mongoose.Schema({
  employeeId: String,
  employeeName: String,
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'LetterTemplate' },
  templateName: String,
  issuedBy: String,
  issueDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['Sent', 'Viewed', 'Signed', 'Revoked'], default: 'Sent' },
  generatedContent: String,
}, { timestamps: true });

const LetterTemplate = mongoose.model('LetterTemplate', letterTemplateSchema);
const IssuedLetter = mongoose.model('IssuedLetter', issuedLetterSchema);

module.exports = { LetterTemplate, IssuedLetter };
