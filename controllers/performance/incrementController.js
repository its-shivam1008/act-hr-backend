const Increment = require('../../models/performanceModels/Increment');

exports.createIncrement = async (req, res) => {
  try {
    const inc = new Increment(req.body);
    await inc.save();
    res.status(201).json(inc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getIncrements = async (req, res) => {
  try {
    const filter = {};
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    const increments = await Increment.find(filter).populate('cycleId');
    res.status(200).json(increments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.approveIncrement = async (req, res) => {
  try {
    const inc = await Increment.findById(req.params.id);
    if (!inc) return res.status(404).json({ error: 'Not found' });

    inc.status = 'HR Approved';
    // Simulate triggering payroll salary revision
    // In a real system, this would call payroll module or update Employee salary structure
    inc.payrollRevisionTriggered = true; 
    
    await inc.save();
    
    res.status(200).json({
      message: 'Increment approved and salary revision triggered in payroll.',
      data: inc
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
