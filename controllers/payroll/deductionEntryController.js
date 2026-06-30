const Employee = require('../../models/Employee');
const Labour   = require('../../models/Labour');
const MonthlyDeduction = require('../../models/payrollModels/MonthlyDeduction');

// Helper: get display name for employee
const getEmpName = (emp) => {
  if (emp.personalInfo?.firstName || emp.personalInfo?.lastName) {
    return `${emp.personalInfo.firstName || ''} ${emp.personalInfo.lastName || ''}`.trim();
  }
  return `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
};

// Helper: get location string from employee
const getEmpLocation = (emp) => {
  // Try nested first, then flat
  return emp.employment?.workLocationName ||
    (emp.employment?.workLocation ? emp.employment.workLocation.toString() : '') ||
    emp.workLocation || '';
};

// Helper: get department from employee
const getEmpDept = (emp) => {
  return emp.employment?.departmentName || emp.department || '';
};

// GET /api/payroll/masters/deduction-entry/locations
exports.getLocations = async (req, res) => {
  try {
    const orgId = req.user?.organisationId;
    if (!orgId) return res.status(401).json({ error: 'Not authorized' });

    // Try both nested and flat location fields
    const empLocs1 = await Employee.distinct('employment.workLocationName', { organisationId: orgId });
    const empLocs2 = await Employee.distinct('workLocation', { organisationId: orgId });
    const labLocs  = await Labour.distinct('employment.locationName', { organisationId: orgId });
    const labLocs2 = await Labour.distinct('locationId', { organisationId: orgId });

    const all = [...new Set([...empLocs1, ...empLocs2, ...labLocs, ...labLocs2].filter(
      loc => loc && loc !== 'null' && loc !== 'undefined' && !loc.match(/^[a-f0-9]{24}$/) // skip ObjectId strings
    ))].sort();

    res.json(all);
  } catch (err) {
    console.error('[deductionEntry] getLocations error:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// GET /api/payroll/masters/deduction-entry?month=&year=&type=Employees|Labour&location=
exports.getDeductionEntries = async (req, res) => {
  try {
    const orgId = req.user?.organisationId;
    if (!orgId) return res.status(401).json({ error: 'Not authorized' });

    const { month, year, type = 'Employees', location, search } = req.query;
    const m = parseInt(month ?? new Date().getMonth());
    const y = parseInt(year  ?? new Date().getFullYear());

    // Fetch existing saved entries for this month/year
    const saved = await MonthlyDeduction.find({ organisationId: orgId, month: m, year: y, type });
    const savedMap = {};
    saved.forEach(s => {
      const key = type === 'Employees' ? s.employeeId?.toString() : s.labourId?.toString();
      if (key) savedMap[key] = s;
    });

    if (type === 'Employees') {
      const query = { organisationId: orgId };
      // Location filter: try both nested and flat
      if (location && location !== 'All Locations') {
        query.$or = [
          { 'employment.workLocationName': location },
          { 'workLocation': location }
        ];
      }
      const employees = await Employee.find(query).lean();

      const rows = employees.map(emp => {
        const existing = savedMap[emp._id.toString()];
        return {
          _id: emp._id,
          name: getEmpName(emp),
          department: getEmpDept(emp),
          location: getEmpLocation(emp),
          taxDeduction:    existing?.taxDeduction    ?? 0,
          healthInsurance: existing?.healthInsurance ?? 0,
          professionalTax: existing?.professionalTax ?? 0,
          advance:         existing?.advance         ?? 0,
        };
      });
      return res.json({ rows, total: rows.length });

    } else {
      // Labour
      const query = { organisationId: orgId };
      if (location && location !== 'All Locations') {
        query.$or = [
          { 'employment.locationName': location },
          { 'locationId': location }
        ];
      }
      const labours = await Labour.find(query).lean();

      const rows = labours.map(lab => {
        const existing = savedMap[lab._id.toString()];
        const labName = `${lab.personalInfo?.firstName || lab.firstName || ''} ${lab.personalInfo?.lastName || lab.lastName || ''}`.trim();
        const labLoc  = lab.employment?.locationName || lab.locationId || '';
        const labDept = lab.employment?.departmentName || lab.department || '';
        const labFormA = lab.employment?.formA || lab.formA || '';
        const labClimsId = lab.employment?.climsId || lab.climsId || '';
        const labAgency = lab.employment?.agencyName || lab.agencyName || labDept;

        return {
          _id: lab._id,
          formA:   labFormA,
          climsId: labClimsId,
          name:    labName,
          agency:  labAgency,
          location: labLoc,
          cash:          existing?.cash          ?? 0,
          miscellaneous: existing?.miscellaneous ?? 0,
          advance:       existing?.advance       ?? 0,
        };
      });
      return res.json({ rows, total: rows.length });
    }
  } catch (err) {
    console.error('[deductionEntry] getDeductionEntries error:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// POST /api/payroll/masters/deduction-entry
exports.saveDeductionEntries = async (req, res) => {
  try {
    const orgId = req.user?.organisationId;
    if (!orgId) return res.status(401).json({ error: 'Not authorized' });

    const { month, year, type = 'Employees', rows } = req.body;
    const m = parseInt(month);
    const y = parseInt(year);

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No rows provided' });
    }

    const bulkOps = rows.map(row => {
      const filter = {
        organisationId: orgId, month: m, year: y, type,
        ...(type === 'Employees' ? { employeeId: row._id } : { labourId: row._id })
      };
      const update = {
        organisationId: orgId, month: m, year: y, type,
        ...(type === 'Employees' ? {
          employeeId:      row._id,
          employeeName:    row.name,
          department:      row.department,
          location:        row.location,
          taxDeduction:    parseFloat(row.taxDeduction)    || 0,
          healthInsurance: parseFloat(row.healthInsurance) || 0,
          professionalTax: parseFloat(row.professionalTax) || 0,
          advance:         parseFloat(row.advance)         || 0,
        } : {
          labourId:      row._id,
          labourName:    row.name,
          formA:         row.formA,
          climsId:       row.climsId,
          agency:        row.agency,
          location:      row.location,
          cash:          parseFloat(row.cash)          || 0,
          miscellaneous: parseFloat(row.miscellaneous) || 0,
          advance:       parseFloat(row.advance)       || 0,
        })
      };
      return { updateOne: { filter, update: { $set: update }, upsert: true } };
    });

    await MonthlyDeduction.bulkWrite(bulkOps);
    res.json({ message: 'Deductions saved successfully', count: bulkOps.length });
  } catch (err) {
    console.error('[deductionEntry] saveDeductionEntries error:', err.message);
    res.status(500).json({ error: 'Failed to save deductions', details: err.message });
  }
};

// GET /api/payroll/masters/labour-deductions
exports.getLabourDeductions = async (req, res) => {
  try {
    const orgId = req.user?.organisationId;
    if (!orgId) return res.status(401).json({ error: 'Not authorized' });

    const { month, year, search, location, status, deductionType, personType } = req.query;
    const m = parseInt(month);
    const y = parseInt(year);

    const query = { organisationId: orgId };
    if (personType && personType !== 'All Types') {
      query.type = personType; // 'Labour' or 'Employee'
    }
    
    // Apply filters
    if (!isNaN(m) && !isNaN(y)) {
      query.month = m;
      query.year = y;
    }
    
    if (location && location !== 'All Locations') {
      query.location = location;
    }
    if (status && status !== 'All Status') {
      query.status = status;
    }
    
    // Fetch from MonthlyDeduction
    let deductions = await MonthlyDeduction.find(query).lean();
    
    // In-memory filters for text search and deduction type (as fields are numeric)
    if (search) {
      const q = search.toLowerCase();
      deductions = deductions.filter(d => 
        (d.labourName && d.labourName.toLowerCase().includes(q)) ||
        (d.formA && d.formA.toLowerCase().includes(q)) ||
        (d.climsId && d.climsId.toLowerCase().includes(q))
      );
    }
    
    if (deductionType && deductionType !== 'All Deductions') {
      if (deductionType === 'Advance') {
        deductions = deductions.filter(d => d.advance > 0);
      } else if (deductionType === 'Miscellaneous') {
        deductions = deductions.filter(d => d.miscellaneous > 0);
      }
    }
    
    // Map to frontend shape
    const rows = deductions.map(r => ({
      id: r._id,
      formA: r.formA || r.employeeId?.toString() || 'not provided',
      climsId: r.climsId || '-',
      name: r.labourName || r.employeeName || 'Unknown',
      agency: r.agency || r.department || '-',
      location: r.location || '',
      cash: r.type === 'Employee' ? r.taxDeduction : (r.cash || 0),
      miscellaneous: r.type === 'Employee' ? r.healthInsurance : (r.miscellaneous || 0),
      advance: r.advance || 0,
      status: r.status,
      deductedBy: r.deductedBy || 'System',
      createdAt: new Date(r.createdAt || new Date()).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
    }));

    res.json({ rows, total: rows.length });
  } catch (err) {
    console.error('[deductionEntry] getLabourDeductions error:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// PUT /api/payroll/masters/labour-deductions/status
exports.updateLabourDeductionStatus = async (req, res) => {
  try {
    const orgId = req.user?.organisationId;
    const userName = req.user?.name || req.user?.firstName || 'Admin';
    if (!orgId) return res.status(401).json({ error: 'Not authorized' });

    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !['Approved', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const result = await MonthlyDeduction.updateMany(
      { _id: { $in: ids }, organisationId: orgId },
      { $set: { status, deductedBy: userName } }
    );

    res.json({ message: 'Status updated successfully', modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error('[deductionEntry] updateLabourDeductionStatus error:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};
