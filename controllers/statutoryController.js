/**
 * ═══════════════════════════════════════════════════════════════════
 *  STATUTORY CONTROLLER
 *  Serves PF / EPS / EPF / ESI / PT breakdowns for Employees & Labours
 * ═══════════════════════════════════════════════════════════════════
 */

const Employee = require("../models/Employee");
const Labour   = require("../models/Labour");
const Location = require("../models/locationModels/Location");
const { computeStatutory, PT_SLABS, STATE_CODE_MAP } = require("../utils/statutoryCalc");

// ── Helper: load persons (employees or labours) for an org ───────────────────
async function loadPersons(orgId, type = "employees", search = "") {
  const searchRegex = search ? new RegExp(search, "i") : null;

  if (type === "labours") {
    const query = { organisationId: orgId };
    if (searchRegex) {
      query.$or = [
        { "personalInfo.firstName": searchRegex },
        { "personalInfo.lastName":  searchRegex },
        { labourId: searchRegex },
      ];
    }
    const labours = await Labour.find(query).lean();
    return labours.map(l => {
      const pi = l.personalInfo || {};
      const em = l.employment   || {};
      const fi = l.financial    || {};
      const st = l.statutory    || {};
      return {
        _id:              l._id,
        _personType:      "labour",
        labourId:         l.labourId,
        employeeId:       l.labourId,
        firstName:        pi.firstName,
        lastName:         pi.lastName,
        dateOfBirth:      pi.dateOfBirth,
        // financials
        basicSalary:      fi.basicPay            ?? l.basicPay   ?? 0,
        basicPay:         fi.basicPay            ?? l.basicPay   ?? 0,
        da:               fi.da                  ?? l.da         ?? 0,
        hra:              fi.hra                  ?? l.hra        ?? 0,
        conveyanceAllowance: fi.convenienceAllowance ?? l.convenienceAllowance ?? 0,
        medicalAllowance: fi.medical              ?? l.medical    ?? 0,
        specialAllowance: 0,
        otherAllowance:   0,
        statutoryBonus:   fi.bonus               ?? l.bonus      ?? 0,
        // statutory IDs
        uanNumber:        st.pfUan               ?? l.pfUan      ?? "",
        esiNumber:        st.esic                ?? l.esic       ?? "",
        panNumber:        st.pan                 ?? l.pan        ?? "",
        // location / state
        workLocationName: em.locationName        ?? l.locationName ?? "",
        state:            "",    // Location model doesn't carry state; enriched below
      };
    });
  } else {
    const query = { organisationId: orgId };
    if (searchRegex) {
      query.$or = [
        { "personalInfo.firstName": searchRegex },
        { "personalInfo.lastName":  searchRegex },
        { "personalInfo.employeeId": searchRegex },
      ];
    }
    const employees = await Employee.find(query).lean();
    return employees.map(e => {
      const pi = e.personalInfo || {};
      const em = e.employment   || {};
      const fi = e.financial    || {};
      const st = e.statutory    || {};
      const ad = e.address      || {};
      return {
        _id:              e._id,
        _personType:      "employee",
        employeeId:       pi.employeeId,
        firstName:        pi.firstName,
        lastName:         pi.lastName,
        dateOfBirth:      pi.dateOfBirth,
        // financials
        basicSalary:      fi.basicSalary          ?? 0,
        da:               fi.da                   ?? 0,
        hra:              fi.hra                   ?? 0,
        conveyanceAllowance: fi.conveyanceAllowance ?? 0,
        medicalAllowance: fi.medicalAllowance      ?? 0,
        specialAllowance: fi.specialAllowance      ?? 0,
        otherAllowance:   fi.otherAllowance        ?? 0,
        statutoryBonus:   fi.statutoryBonus        ?? 0,
        // statutory IDs
        uanNumber:        st.uanNumber             ?? "",
        esiNumber:        st.esiNumber             ?? "",
        panNumber:        st.panNumber             ?? "",
        pfNumber:         st.pfNumber              ?? "",
        // location / state
        workLocationName: em.workLocationName      ?? "",
        state:            ad.state                 ?? "",
      };
    });
  }
}

// ── Enrich persons with state from location master if state is missing ────────
async function enrichWithState(persons, orgId) {
  // Collect unique location names that don't have a state
  const missing = persons.filter(p => !p.state && p.workLocationName);
  if (!missing.length) return persons;

  const locNames = [...new Set(missing.map(p => p.workLocationName))];
  const locations = await Location.find({
    organisationId: orgId,
    name: { $in: locNames },
  }).select("name state").lean();

  const locMap = {};
  locations.forEach(l => { locMap[l.name] = l.state || ""; });

  return persons.map(p => ({
    ...p,
    state: p.state || locMap[p.workLocationName] || "",
  }));
}

// ── Main: compute for all persons ─────────────────────────────────────────────
async function getStatutoryData(req, res) {
  try {
    const orgId  = req.user.organisationId;
    const type   = req.query.type   || "employees";
    const search = req.query.search || "";

    let persons = await loadPersons(orgId, type, search);
    persons = await enrichWithState(persons, orgId);

    const results = persons.map(p => computeStatutory(p));
    return res.json({ success: true, data: results, total: results.length });
  } catch (err) {
    console.error("[Statutory]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ── PF Summary ────────────────────────────────────────────────────────────────
async function getPFSummary(req, res) {
  try {
    const orgId  = req.user.organisationId;
    const type   = req.query.type   || "employees";
    const search = req.query.search || "";

    let persons = await loadPersons(orgId, type, search);
    persons = await enrichWithState(persons, orgId);
    const data = persons.map(p => computeStatutory(p));

    const totalEEShare    = data.reduce((s, r) => s + r.eePF,   0);
    const totalERShare    = data.reduce((s, r) => s + r.erEPF,  0);
    const totalERCost     = data.reduce((s, r) => s + r.erPFTotal, 0);
    const totalEPS        = data.reduce((s, r) => s + r.erEPS,  0);
    const totalEDLI       = data.reduce((s, r) => s + r.edli,   0);
    const totalAdmin      = data.reduce((s, r) => s + r.pfAdmin, 0);
    const missingUAN      = data.filter(r => !r.uanNumber).length;

    const rows = data.map(r => ({
      _id:              r._id,
      personType:       r.personType,
      employeeId:       r.employeeId,
      name:             `${r.firstName || ""} ${r.lastName || ""}`.trim(),
      uanNumber:        r.uanNumber,
      basic:            r.basic,
      da:               r.da,
      pfWage:           r.pfWage,
      pfWageCapped:     r.pfWageCapped,
      eePF:             r.eePF,
      erEPF:            r.erEPF,
      erEPS:            r.erEPS,
      edli:             r.edli,
      pfAdmin:          r.pfAdmin,
      epsEligible:      r.epsEligible,
      age:              r.age,
      workLocationName: r.workLocationName,
      status:           !r.uanNumber ? "Missing UAN" : r.employerCost > 0 ? "Valid" : "No Salary",
    }));

    return res.json({
      success: true,
      summary: { totalEEShare, totalERShare, totalERCost, totalEPS, totalEDLI, totalAdmin, missingUAN, total: data.length },
      data:    rows,
    });
  } catch (err) {
    console.error("[PF Summary]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ── EPS Summary ───────────────────────────────────────────────────────────────
async function getEPSSummary(req, res) {
  try {
    const orgId  = req.user.organisationId;
    const type   = req.query.type   || "employees";
    const search = req.query.search || "";

    let persons = await loadPersons(orgId, type, search);
    persons = await enrichWithState(persons, orgId);
    const data = persons.map(p => computeStatutory(p));

    const eligible    = data.filter(r => r.epsEligible);
    const ineligible  = data.filter(r => !r.epsEligible);
    const totalEPS    = data.reduce((s, r) => s + r.erEPS, 0);

    const rows = data.map(r => ({
      _id:              r._id,
      personType:       r.personType,
      employeeId:       r.employeeId,
      name:             `${r.firstName || ""} ${r.lastName || ""}`.trim(),
      age:              r.age,
      basic:            r.basic,
      da:               r.da,
      pfWage:           r.pfWage,
      pfWageCapped:     r.pfWageCapped,
      erEPS:            r.erEPS,
      epsEligible:      r.epsEligible,
      workLocationName: r.workLocationName,
    }));

    return res.json({
      success: true,
      summary: { totalEPS, eligible: eligible.length, ineligible: ineligible.length, total: data.length },
      data:    rows,
    });
  } catch (err) {
    console.error("[EPS Summary]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ── EPF Summary ───────────────────────────────────────────────────────────────
async function getEPFSummary(req, res) {
  try {
    const orgId  = req.user.organisationId;
    const type   = req.query.type   || "employees";
    const search = req.query.search || "";

    let persons = await loadPersons(orgId, type, search);
    persons = await enrichWithState(persons, orgId);
    const data = persons.map(p => computeStatutory(p));

    const totalEEShare = data.reduce((s, r) => s + r.eePF,   0);
    const totalERShare = data.reduce((s, r) => s + r.erEPF,  0);
    const totalAdmin   = data.reduce((s, r) => s + r.pfAdmin, 0);
    const totalEDLI    = data.reduce((s, r) => s + r.edli,   0);
    const missingUAN   = data.filter(r => !r.uanNumber).length;

    const rows = data.map(r => ({
      _id:              r._id,
      personType:       r.personType,
      employeeId:       r.employeeId,
      name:             `${r.firstName || ""} ${r.lastName || ""}`.trim(),
      uanNumber:        r.uanNumber,
      basic:            r.basic,
      da:               r.da,
      pfWage:           r.pfWage,
      pfWageCapped:     r.pfWageCapped,
      eePF:             r.eePF,
      erEPF:            r.erEPF,
      edli:             r.edli,
      pfAdmin:          r.pfAdmin,
      workLocationName: r.workLocationName,
      status:           !r.uanNumber ? "Missing UAN" : "Valid",
    }));

    return res.json({
      success: true,
      summary: { totalEEShare, totalERShare, totalAdmin, totalEDLI, missingUAN, total: data.length },
      data:    rows,
    });
  } catch (err) {
    console.error("[EPF Summary]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ── ESI Summary ───────────────────────────────────────────────────────────────
async function getESISummary(req, res) {
  try {
    const orgId  = req.user.organisationId;
    const type   = req.query.type   || "employees";
    const search = req.query.search || "";

    let persons = await loadPersons(orgId, type, search);
    persons = await enrichWithState(persons, orgId);
    const data = persons.map(p => computeStatutory(p));

    const covered = data.filter(r => r.esiEligible);
    const exempt  = data.filter(r => !r.esiEligible && r.gross > 0);
    const totalEE = data.reduce((s, r) => s + r.eeESI, 0);
    const totalER = data.reduce((s, r) => s + r.erESI, 0);

    const rows = data.map(r => ({
      _id:              r._id,
      personType:       r.personType,
      employeeId:       r.employeeId,
      name:             `${r.firstName || ""} ${r.lastName || ""}`.trim(),
      esiNumber:        r.esiNumber,
      gross:            r.gross,
      esiEligible:      r.esiEligible,
      eeESI:            r.eeESI,
      erESI:            r.erESI,
      totalESI:         r.eeESI + r.erESI,
      workLocationName: r.workLocationName,
      status:           r.esiEligible ? "Covered" : "Exempt",
    }));

    return res.json({
      success: true,
      summary: { covered: covered.length, exempt: exempt.length, totalEE, totalER, total: data.length },
      data:    rows,
    });
  } catch (err) {
    console.error("[ESI Summary]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ── PT Summary ────────────────────────────────────────────────────────────────
async function getPTSummary(req, res) {
  try {
    const orgId  = req.user.organisationId;
    const type   = req.query.type   || "employees";
    const search = req.query.search || "";

    let persons = await loadPersons(orgId, type, search);
    persons = await enrichWithState(persons, orgId);
    const data = persons.map(p => computeStatutory(p));

    const liable  = data.filter(r => r.ptApplicable);
    const exempt  = data.filter(r => !r.ptApplicable);
    const totalPT = data.reduce((s, r) => s + r.pt, 0);

    const rows = data.map(r => ({
      _id:          r._id,
      personType:   r.personType,
      employeeId:   r.employeeId,
      name:         `${r.firstName || ""} ${r.lastName || ""}`.trim(),
      state:        r.state,
      stateCode:    r.stateCode,
      gross:        r.gross,
      pt:           r.pt,
      ptApplicable: r.ptApplicable,
      ptMessage:    r.ptMessage,
      workLocationName: r.workLocationName,
    }));

    return res.json({
      success: true,
      summary: { totalPT, liable: liable.length, exempt: exempt.length, total: data.length },
      data:    rows,
    });
  } catch (err) {
    console.error("[PT Summary]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ── PT Slabs (reference data) ─────────────────────────────────────────────────
async function getPTSlabs(req, res) {
  try {
    const { PT_SLABS, STATE_CODE_MAP } = require("../utils/statutoryCalc");
    const stateNames = Object.fromEntries(Object.entries(STATE_CODE_MAP).map(([k, v]) => [v, k]));
    const slabs = Object.entries(PT_SLABS).map(([code, slabList]) => ({
      code,
      stateName: stateNames[code] || code,
      slabs: slabList,
    }));
    return res.json({ success: true, slabs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ── TDS Summary ───────────────────────────────────────────────────────────────
async function getTDSSummary(req, res) {
  try {
    const orgId  = req.user.organisationId;
    const type   = req.query.type   || "employees";
    const search = req.query.search || "";

    let persons = await loadPersons(orgId, type, search);
    persons = await enrichWithState(persons, orgId);
    const data = persons.map(p => computeStatutory(p));

    const totalMonthlyTDS = data.reduce((s, r) => s + (r.tds || 0), 0);
    const tdsLiable       = data.filter(r => (r.tds || 0) > 0).length;
    const zeroTax         = data.filter(r => (r.tds || 0) === 0).length;

    const rows = data.map(r => ({
      _id:          r._id,
      personType:   r.personType,
      employeeId:   r.employeeId,
      name:         `${r.firstName || ""} ${r.lastName || ""}`.trim(),
      panNumber:    r.panNumber,
      regime:       "New Regime", // Default to New Regime as shown in mock/screenshot
      monthlyGross: r.gross,
      annualGross:  r.gross * 12,
      annualTax:    0,
      monthlyTDS:   r.tds || 0,
      workLocationName: r.workLocationName,
    }));

    return res.json({
      success: true,
      summary: { totalMonthlyTDS, tdsLiable, zeroTax, total: data.length },
      data:    rows,
    });
  } catch (err) {
    console.error("[TDS Summary]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getStatutoryData,
  getPFSummary,
  getEPSSummary,
  getEPFSummary,
  getESISummary,
  getPTSummary,
  getPTSlabs,
  getTDSSummary,
};
