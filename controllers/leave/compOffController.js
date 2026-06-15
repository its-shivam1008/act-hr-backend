const CompOff = require('../../models/leaveModels/CompOff');

exports.getCompOffs = async (req, res) => {
  try {
    const compOffs = await CompOff.find().populate('employeeId', 'name employeeId');
    res.json(compOffs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.creditCompOff = async (req, res) => {
  try {
    const { employeeId, workedDate, creditDays } = req.body;
    
    // expiry is 30 days from workedDate
    const expiryDate = new Date(workedDate);
    expiryDate.setDate(expiryDate.getDate() + 30);
    
    const newCompOff = new CompOff({
      employeeId,
      workedDate,
      creditDays,
      expiryDate,
      status: 'Active'
    });
    
    await newCompOff.save();
    res.status(201).json(newCompOff);
  } catch (err) {
    res.status(500).json({ error: 'Error crediting comp-off', details: err.message });
  }
};
