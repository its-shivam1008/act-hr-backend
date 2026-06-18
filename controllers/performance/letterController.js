const { LetterTemplate, IssuedLetter } = require('../../models/performanceModels/Letter');

// Seed default templates if none exist
const seedTemplates = async () => {
  const count = await LetterTemplate.countDocuments();
  if (count === 0) {
    await LetterTemplate.insertMany([
      { name: 'Offer Letter - Standard', category: 'Recruitment', content: 'Dear {{name}},\n\nWe are pleased to offer you the position of {{role}} at the organization.\n\nYour compensation will be {{ctc}} per annum.\n\nWe look forward to your joining.\n\nRegards,\nHR Team' },
      { name: 'Annual Appraisal Letter', category: 'Performance', content: 'Dear {{name}},\n\nBased on your performance review, we are pleased to revise your compensation effective from {{date}}.\n\nYour new CTC is {{ctc}}.\n\nThank you for your valuable contributions.\n\nRegards,\nHR Team' },
      { name: 'Promotion Letter', category: 'Performance', content: 'Dear {{name}},\n\nCongratulations! We are pleased to promote you to the position of {{role}} effective from {{date}}.\n\nYour performance and commitment have been exemplary.\n\nBest Wishes,\nManagement' },
      { name: 'Warning Letter (Attendance)', category: 'Disciplinary', content: 'Dear {{name}},\n\nThis letter is to formally warn you regarding your attendance issues.\n\nWe expect immediate improvement in your attendance record.\n\nRegards,\nHR Department' },
      { name: 'Relieving Letter', category: 'Exit', content: 'To Whom It May Concern,\n\nThis is to certify that {{name}} was employed with us from {{doj}} to {{date}} in the role of {{role}}.\n\nWe wish them all the best in future endeavors.\n\nRegards,\nHR Department' },
    ]);
  }
};
seedTemplates();

exports.getTemplates = async (req, res) => {
  try {
    const templates = await LetterTemplate.find().sort({ createdAt: -1 });
    res.json(templates);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createTemplate = async (req, res) => {
  try {
    const tpl = new LetterTemplate(req.body);
    await tpl.save();
    res.status(201).json(tpl);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.updateTemplate = async (req, res) => {
  try {
    const tpl = await LetterTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(tpl);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.deleteTemplate = async (req, res) => {
  try {
    await LetterTemplate.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getIssuedLetters = async (req, res) => {
  try {
    const letters = await IssuedLetter.find().sort({ createdAt: -1 });
    res.json(letters);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.issueLetter = async (req, res) => {
  try {
    const { templateId, employeeName, employeeId, issuedBy, issueDate } = req.body;
    const template = await LetterTemplate.findById(templateId);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    // Simple variable replacement
    let content = template.content
      .replace(/{{name}}/g, employeeName || 'Employee')
      .replace(/{{date}}/g, issueDate ? new Date(issueDate).toLocaleDateString() : new Date().toLocaleDateString());

    const letter = new IssuedLetter({
      employeeId, employeeName, templateId, templateName: template.name,
      issuedBy: issuedBy || 'HR Manager',
      issueDate: issueDate || new Date(),
      generatedContent: content,
      status: 'Sent'
    });
    await letter.save();

    // Increment usedCount
    await LetterTemplate.findByIdAndUpdate(templateId, { $inc: { usedCount: 1 } });

    res.status(201).json(letter);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.updateLetterStatus = async (req, res) => {
  try {
    const letter = await IssuedLetter.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(letter);
  } catch (err) { res.status(400).json({ error: err.message }); }
};
