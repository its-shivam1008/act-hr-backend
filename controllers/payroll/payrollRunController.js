const PayrollRun = require("../../models/payrollModels/PayrollRun");
const AttendancePayroll = require("../../models/payrollModels/AttendancePayroll");
const Overtime = require("../../models/payrollModels/Overtime");
const Bonus = require("../../models/bonus/Bonus");
const Arrear = require("../../models/payrollModels/Arrear");
const PayrollLock = require("../../models/payrollModels/PayrollLock");
const SalaryStructure = require("../../models/payrollModels/SalaryStructure");
const Employee = require("../../models/Employee");
const Labour = require("../../models/Labour");
const VariablePay = require("../../models/payrollModels/VariablePay");

// ── GET payroll runs ──────────────────────────────────────────────────────────
exports.getPayrollRuns = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { month, year, status, personType, page, limit } = req.query;
    const filter = { organisationId: orgId };
    if (month) filter.month = Number(month);
    if (year)  filter.year  = Number(year);
    if (status && status !== "All") filter.status = status;
    if (personType) filter.personType = personType;

    if (page && limit) {
      const p = Number(page) || 1;
      const l = Number(limit) || 20;
      const total = await PayrollRun.countDocuments(filter);
      const runs = await PayrollRun.find(filter)
        .sort({ employeeName: 1 })
        .skip((p - 1) * l)
        .limit(l);
      return res.json({ success: true, total, page: p, limit: l, data: runs });
    }

    const runs = await PayrollRun.find(filter).sort({ employeeName: 1 });
    res.json({ success: true, data: runs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET single payroll run ────────────────────────────────────────────────────
exports.getPayrollRunById = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const run = await PayrollRun.findOne({ _id: req.params.id, organisationId: orgId });
    if (!run) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: run });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Core calculation helper ───────────────────────────────────────────────────
function calcNetSalary(data) {
  const gross =
    (data.basic || 0) + (data.hra || 0) + (data.da || 0) +
    (data.medical || 0) + (data.special || 0) + (data.conveyance || 0) +
    (data.bonus || 0) + (data.otAmount || 0) + (data.arrear || 0) +
    (data.otherEarnings || 0);

  const totalDeductions =
    (data.pf || 0) + (data.esi || 0) + (data.pt || 0) + (data.tds || 0) +
    (data.loanDeduction || 0) + (data.advanceDeduction || 0) +
    (data.lopDeduction || 0) + (data.otherDeductions || 0);

  const netSalary = Math.max(0, gross - totalDeductions);
  return { gross, totalDeductions, netSalary };
}

// ── POST create / manual run ─────────────────────────────────────────────────
exports.createPayrollRun = async (req, res) => {
  try {
    const orgId = req.user.organisationId;

    // Check payroll lock
    const { month, year } = req.body;
    const lock = await PayrollLock.findOne({ organisationId: orgId, month: Number(month), year: Number(year) });
    if (lock?.locked) {
      return res.status(423).json({ success: false, message: `Payroll for ${month}/${year} is locked` });
    }

    const body = { ...req.body, organisationId: orgId };
    const { gross, totalDeductions, netSalary } = calcNetSalary(body);
    body.gross = gross;
    body.totalDeductions = totalDeductions;
    body.netSalary = netSalary;

    const run = await PayrollRun.create(body);
    res.status(201).json({ success: true, data: run });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Payroll run already exists for this employee/month" });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── PUT update a payroll run ──────────────────────────────────────────────────
exports.updatePayrollRun = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const run = await PayrollRun.findOne({ _id: req.params.id, organisationId: orgId });
    if (!run) return res.status(404).json({ success: false, message: "Not found" });

    // Check lock
    const lock = await PayrollLock.findOne({ organisationId: orgId, month: run.month, year: run.year });
    if (lock?.locked) {
      return res.status(423).json({ success: false, message: `Payroll for ${run.month}/${run.year} is locked` });
    }

    Object.assign(run, req.body);
    const { gross, totalDeductions, netSalary } = calcNetSalary(run);
    run.gross = gross;
    run.totalDeductions = totalDeductions;
    run.netSalary = netSalary;
    await run.save();

    res.json({ success: true, data: run });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── DELETE a payroll run ──────────────────────────────────────────────────────
exports.deletePayrollRun = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const run = await PayrollRun.findOne({ _id: req.params.id, organisationId: orgId });
    if (!run) return res.status(404).json({ success: false, message: "Not found" });

    const lock = await PayrollLock.findOne({ organisationId: orgId, month: run.month, year: run.year });
    if (lock?.locked) {
      return res.status(423).json({ success: false, message: "Payroll is locked" });
    }

    await PayrollRun.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Payroll run deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST bulk process payroll for entire org ──────────────────────────────────
// Auto-fetches attendance, OT, bonus, arrear, and creates/updates payroll runs
exports.processPayroll = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { month, year, salaryStructureId, personType } = req.body;
    if (!month || !year) return res.status(422).json({ success: false, message: "month and year required" });

    const m = Number(month), y = Number(year);

    // Check lock
    const lock = await PayrollLock.findOne({ organisationId: orgId, month: m, year: y });
    if (lock?.locked) return res.status(423).json({ success: false, message: "Payroll is locked for this period" });

    // Load all attendance records
    const attFilter = { organisationId: orgId, month: m, year: y };
    if (personType) attFilter.personType = personType;
    const attendances = await AttendancePayroll.find(attFilter);
    if (!attendances.length) {
      return res.status(422).json({ success: false, message: "No attendance records found. Please sync attendance first." });
    }

    let processed = 0, errors = [];

    for (const att of attendances) {
      try {
        const empId = att.employeeId;

        // Load employee or labour
        let person = await Employee.findOne({ _id: empId, organisationId: orgId });
        let isLabour = false;
        if (!person) {
          person = await Labour.findOne({ _id: empId, organisationId: orgId });
          isLabour = true;
        }

        if (!person) {
          errors.push({ employee: att.employeeName, error: "Record not found in Master (Employee/Labour)" });
          continue;
        }

        // Auto-detect or fetch salary structure
        let structure = null;
        if (!isLabour) {
          if (salaryStructureId) {
            structure = await SalaryStructure.findOne({ _id: salaryStructureId, organisationId: orgId });
          } else if (person.employment?.gradeName) {
            structure = await SalaryStructure.findOne({
              organisationId: orgId,
              $or: [
                { code: person.employment.gradeName },
                { name: person.employment.gradeName }
              ]
            });
          }
        }

        // Component Base Values
        let compBasic = 0;
        let compHra = 0;
        let compDa = 0;
        let compMedical = 0;
        let compConveyance = 0;
        let compSpecial = 0;

        if (isLabour) {
          compBasic = person.financial?.basicPay || person.financial?.monthlyRate || ((person.financial?.ratePerDay || 0) * 26) || 0;
          compHra = person.financial?.hra || 0;
          compDa = person.financial?.da || 0;
          compConveyance = person.financial?.convenienceAllowance || 0;
          compMedical = person.financial?.medical || 0;
          compSpecial = person.financial?.siteAllowance || person.financial?.foodAllowance || 0;
        } else if (structure) {
          const monthlyCTC = (person.financial?.ctc || structure.ctc || 0) / 12 || (person.financial?.basicSalary || 0) * 2 || 0;

          const evalComp = (comp) => {
            if (!comp) return 0;
            if (comp.type === "Fixed") return comp.value;
            if (comp.type === "Percentage") return (comp.value / 100) * monthlyCTC;
            if (comp.type === "Formula") {
              if (comp.formula && comp.formula.toLowerCase().includes("basic")) {
                const basicVal = structure.components.find(c => c.category === "Basic" && c.kind === "Earning")?.value || 0;
                const basicAmt = (basicVal > 100) ? basicVal : (basicVal / 100) * monthlyCTC;
                return (comp.value / 100) * basicAmt;
              }
              return (comp.value / 100) * monthlyCTC;
            }
            return comp.value;
          };

          const basicComp = structure.components.find(c => c.category === "Basic" && c.kind === "Earning");
          const hraComp = structure.components.find(c => c.category === "HRA" && c.kind === "Earning");
          const daComp = structure.components.find(c => c.category === "DA" && c.kind === "Earning");
          const medComp = structure.components.find(c => c.category === "Medical" && c.kind === "Earning");
          const convComp = structure.components.find(c => c.category === "Conveyance" && c.kind === "Earning");
          const specComp = structure.components.find(c => c.category === "Special" && c.kind === "Earning");

          compBasic = evalComp(basicComp);
          compHra = evalComp(hraComp);
          compDa = evalComp(daComp);
          compMedical = evalComp(medComp);
          compConveyance = evalComp(convComp);
          compSpecial = evalComp(specComp);

          // balancing
          if (specComp && specComp.type === "Balancing") {
            const sumOthers = compBasic + compHra + compDa + compMedical + compConveyance;
            compSpecial = Math.max(0, monthlyCTC - sumOthers);
          }
        } else {
          compBasic = person.financial?.basicSalary || 0;
          compHra = person.financial?.hra || 0;
          compDa = person.financial?.da || 0;
          compMedical = person.financial?.medicalAllowance || 0;
          compConveyance = person.financial?.conveyanceAllowance || 0;
          const totalFixed = compBasic + compHra + compDa + compMedical + compConveyance;
          compSpecial = Math.max(0, (person.financial?.ctc || totalFixed) - totalFixed);
        }

        // Check if mid-month joiner / resigner
        const joinDate = person.employment?.dateOfJoining ? new Date(person.employment.dateOfJoining) : null;
        const leaveDate = person.employment?.dateOfLeaving ? new Date(person.employment.dateOfLeaving) : null;

        let isMidMonthJoiner = false;
        let isMidMonthResigner = false;

        if (joinDate && joinDate.getFullYear() === y && (joinDate.getMonth() + 1) === m) {
          if (joinDate.getDate() > 1) isMidMonthJoiner = true;
        }
        if (leaveDate && leaveDate.getFullYear() === y && (leaveDate.getMonth() + 1) === m) {
          const lastDayOfMonth = new Date(y, m, 0).getDate();
          if (leaveDate.getDate() < lastDayOfMonth) isMidMonthResigner = true;
        }

        const isPartialMonth = isMidMonthJoiner || isMidMonthResigner;
        const totalDays = att.totalDays || 26;
        const paidDays = att.paidDays ?? totalDays;

        let basic = compBasic;
        let hra = compHra;
        let da = compDa;
        let medical = compMedical;
        let conveyance = compConveyance;
        let special = compSpecial;
        let lopDeduction = 0;

        if (isPartialMonth) {
          const factor = paidDays / totalDays;
          basic = Math.round(compBasic * factor);
          hra = Math.round(compHra * factor);
          da = Math.round(compDa * factor);
          medical = Math.round(compMedical * factor);
          conveyance = Math.round(compConveyance * factor);
          special = Math.round(compSpecial * factor);
          lopDeduction = 0;
        } else {
          // If not partial month, keep earning components full and deduct LOP days
          const fullGross = compBasic + compHra + compDa + compMedical + compConveyance + compSpecial;
          lopDeduction = Math.round((fullGross / totalDays) * att.lop);
        }

        // OT for this employee this month
        const otRecs = await Overtime.find({ organisationId: orgId, employeeId: empId, month: m, year: y, status: "Approved" });
        const otAmount = otRecs.reduce((s, r) => s + (r.otAmount || 0), 0);

        // Bonus & Variable Pay
        const bonusRecs = await Bonus.find({ organisationId: orgId, employeeId: empId.toString() });
        const bonusAmount = bonusRecs.reduce((s, b) => s + (b.bonusAmount || 0), 0);

        const vpRecs = await VariablePay.find({ organisationId: orgId, employeeId: empId, month: m, year: y, status: "Approved" });
        const vpAmount = vpRecs.reduce((s, r) => s + (r.amount || 0), 0);
        const finalBonus = Math.round(bonusAmount + vpAmount);

        // Arrear (pending, for this month)
        const arrearRec = await Arrear.findOne({ organisationId: orgId, employeeId: empId, appliedMonth: m, appliedYear: y, status: "Pending" });
        const arrearAmount = arrearRec?.arrearAmount || 0;

        // Statutory calculations
        const pfWage = basic + da;
        const pf = Math.round(Math.min(pfWage * 0.12, 1800));

        // Gross for ESI check (excluding OT/bonus/arrears if needed, or including them)
        const grossForESI = basic + hra + da + medical + conveyance + special;
        const esiEligible = grossForESI <= 21000 && grossForESI > 0;
        const esi = esiEligible ? Math.round(grossForESI * 0.0075) : 0;

        // PT: Maharashtra PT rule: Rs. 200/month if salary > 10,000
        const pt = (basic + hra + da + medical + conveyance + special + finalBonus + otAmount + arrearAmount) > 10000 ? 200 : 0;
        const tds = 0;

        const payData = {
          organisationId: orgId,
          employeeId: empId,
          employeeName: att.employeeName,
          employeeCode: att.employeeCode,
          department: att.department,
          personType: att.personType || (isLabour ? "Labour" : "Employee"),
          month: m, year: y,
          salaryStructureId: structure?._id || null,
          basic: Math.round(basic), hra: Math.round(hra), da: Math.round(da),
          medical, special: Math.round(special), conveyance,
          bonus: finalBonus, otAmount: Math.round(otAmount),
          arrear: Math.round(arrearAmount), otherEarnings: 0,
          pf: Math.round(pf), esi: Math.round(esi), pt, tds,
          loanDeduction: 0, advanceDeduction: 0,
          lopDeduction, otherDeductions: 0,
          paidDays: att.paidDays, lop: att.lop,
          status: "Processed",
        };

        const { gross, totalDeductions, netSalary } = calcNetSalary(payData);
        payData.gross = gross;
        payData.totalDeductions = totalDeductions;
        payData.netSalary = netSalary;

        await PayrollRun.findOneAndUpdate(
          { organisationId: orgId, employeeId: empId, month: m, year: y },
          payData,
          { upsert: true, new: true }
        );

        // Mark arrear as applied
        if (arrearRec) {
          arrearRec.applied = true;
          arrearRec.status = "Applied";
          await arrearRec.save();
        }

        // Mark variable pays as processed
        for (const vp of vpRecs) {
          vp.status = "Processed";
          await vp.save();
        }

        processed++;
      } catch (e) {
        errors.push({ employee: att.employeeName, error: e.message });
      }
    }

    res.json({ success: true, message: `Payroll processed for ${processed} records`, errors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET payroll summary stats ─────────────────────────────────────────────────
exports.getPayrollSummary = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { month, year } = req.query;
    const filter = { organisationId: orgId };
    if (month) filter.month = Number(month);
    if (year)  filter.year  = Number(year);

    const runs = await PayrollRun.find(filter);
    const totalGross = runs.reduce((s, r) => s + r.gross, 0);
    const totalNet   = runs.reduce((s, r) => s + r.netSalary, 0);
    const totalDeductions = runs.reduce((s, r) => s + r.totalDeductions, 0);
    const employeeCount = runs.length;

    res.json({ success: true, summary: { totalGross, totalNet, totalDeductions, employeeCount } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
