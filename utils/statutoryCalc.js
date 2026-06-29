/**
 * ═══════════════════════════════════════════════════════════════════
 *  STATUTORY CALCULATION ENGINE
 *  All statutory deductions for Employees and Labours
 * ═══════════════════════════════════════════════════════════════════
 */

// ── Configurable Constants ────────────────────────────────────────────────────
const PF_WAGE_CAP      = 15000;   // ₹15,000 PF wage ceiling
const PF_RATE_EE       = 0.12;    // Employee PF 12%
const PF_RATE_ER       = 0.12;    // Employer PF 12%
const EPS_RATE         = 0.0833;  // Employer EPS 8.33% (of PF wage)
const EDLI_RATE        = 0.005;   // EDLI 0.5%
const PF_ADMIN_RATE    = 0.005;   // PF Admin charges 0.5%
const ESI_WAGE_LIMIT   = 21000;   // ₹21,000 ESI eligibility ceiling
const ESI_RATE_EE      = 0.0075;  // Employee ESI 0.75%
const ESI_RATE_ER      = 0.0325;  // Employer ESI 3.25%
const EPS_AGE_LIMIT    = 58;      // EPS stops at age 58

// ── Professional Tax State Slabs ─────────────────────────────────────────────
// Format: [{ upTo: number|null, pt: number }]  (null = no upper limit)
const PT_SLABS = {
  MH: [ // Maharashtra
    { upTo: 7500,  pt: 0   },
    { upTo: 10000, pt: 175 },
    { upTo: null,  pt: 200 },
  ],
  KA: [ // Karnataka
    { upTo: 15000, pt: 0   },
    { upTo: null,  pt: 200 },
  ],
  TN: [ // Tamil Nadu
    { upTo: 21000, pt: 0   },
    { upTo: 30000, pt: 135 },
    { upTo: 45000, pt: 315 },
    { upTo: 60000, pt: 690 },
    { upTo: 75000, pt: 1025},
    { upTo: null,  pt: 1250},
  ],
  AP: [ // Andhra Pradesh
    { upTo: 15000, pt: 0   },
    { upTo: 20000, pt: 150 },
    { upTo: null,  pt: 200 },
  ],
  TS: [ // Telangana
    { upTo: 15000, pt: 0   },
    { upTo: 20000, pt: 150 },
    { upTo: null,  pt: 200 },
  ],
  WB: [ // West Bengal
    { upTo: 8500,  pt: 0   },
    { upTo: 10000, pt: 90  },
    { upTo: 15000, pt: 110 },
    { upTo: 25000, pt: 130 },
    { upTo: 40000, pt: 150 },
    { upTo: null,  pt: 200 },
  ],
  MP: [ // Madhya Pradesh
    { upTo: 18750, pt: 0   },
    { upTo: null,  pt: 208 },
  ],
  GJ: [ // Gujarat
    { upTo: 5999,  pt: 0   },
    { upTo: 8999,  pt: 80  },
    { upTo: 11999, pt: 150 },
    { upTo: null,  pt: 200 },
  ],
  // States with NO PT
  UP:  null,
  HR:  null,
  RJ:  null,
  DL:  null,
  PB:  null,
  HP:  null,
  UK:  null,
  JK:  null,
  GA:  null,
  // Orissa / Odisha
  OD: [
    { upTo: 13304, pt: 0   },
    { upTo: null,  pt: 208 },
  ],
  // Jharkhand
  JH: [
    { upTo: 25000, pt: 100 },
    { upTo: null,  pt: 150 },
  ],
};

// State name → code mapping (for location-based lookup)
const STATE_CODE_MAP = {
  "maharashtra": "MH", "karnataka": "KA", "tamil nadu": "TN",
  "andhra pradesh": "AP", "telangana": "TS", "west bengal": "WB",
  "madhya pradesh": "MP", "gujarat": "GJ", "uttar pradesh": "UP",
  "haryana": "HR", "rajasthan": "RJ", "delhi": "DL", "punjab": "PB",
  "himachal pradesh": "HP", "uttarakhand": "UK", "jammu & kashmir": "JK",
  "goa": "GA", "odisha": "OD", "jharkhand": "JH",
};

/**
 * Lookup state code from state name string
 */
function getStateCode(stateName = "") {
  const lower = stateName.trim().toLowerCase();
  return STATE_CODE_MAP[lower] || null;
}

/**
 * Calculate Professional Tax for a given gross salary and state
 * @param {number} gross
 * @param {string} stateCode - e.g. "MH"
 * @returns {{ pt: number, stateCode: string, applicable: boolean, message: string }}
 */
function calcPT(gross, stateCode) {
  if (!stateCode) return { pt: 0, applicable: false, message: "State not identified" };
  const slabs = PT_SLABS[stateCode];
  if (slabs === undefined) return { pt: 0, applicable: false, message: `PT rules not configured for ${stateCode}` };
  if (slabs === null) return { pt: 0, applicable: false, message: `PT not applicable in ${stateCode}` };

  for (const slab of slabs) {
    if (slab.upTo === null || gross <= slab.upTo) {
      return { pt: slab.pt, applicable: slab.pt > 0, message: slab.pt > 0 ? "Liable" : "Exempt (below slab)" };
    }
  }
  return { pt: 0, applicable: false, message: "Below all slabs" };
}

/**
 * Calculate age in years from DOB
 */
function calcAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

/**
 * Core statutory computation for one person (employee or labour)
 *
 * @param {Object} p - Person data (flat fields)
 * @returns {Object} - Full statutory breakdown
 */
function computeStatutory(p) {
  // ── Salary Components ────────────────────────────────────────
  const basic    = Number(p.basicSalary  || p.basicPay   || 0);
  const da       = Number(p.da           || 0);
  const hra      = Number(p.hra          || 0);
  const conv     = Number(p.conveyanceAllowance || p.convenienceAllowance || 0);
  const medical  = Number(p.medicalAllowance    || p.medical             || 0);
  const special  = Number(p.specialAllowance    || 0);
  const other    = Number(p.otherAllowance      || 0);
  const bonus    = Number(p.statutoryBonus      || 0);

  // ── Step 1: Gross Salary ──────────────────────────────────────
  const gross = basic + da + hra + conv + medical + special + other + bonus;

  // ── Step 2: PF Wage ────────────────────────────────────────────
  const pfWageRaw = basic + da;
  const pfWage    = Math.min(pfWageRaw, PF_WAGE_CAP);
  const pfWageCapped = pfWageRaw > PF_WAGE_CAP;

  // ── Step 3: Employee PF ────────────────────────────────────────
  const eePF = Math.round(pfWage * PF_RATE_EE);

  // ── Step 4: Employer PF split ─────────────────────────────────
  const erPFTotal = Math.round(pfWage * PF_RATE_ER);
  const erEPS     = Math.round(pfWage * EPS_RATE);
  const erEPF     = erPFTotal - erEPS;   // 3.67% effectively

  // ── Step 5: EDLI ───────────────────────────────────────────────
  const edli = Math.round(pfWage * EDLI_RATE);

  // ── Step 6: PF Admin ───────────────────────────────────────────
  const pfAdmin = Math.max(Math.round(pfWage * PF_ADMIN_RATE), 75); // minimum ₹75

  // ── Step 7: ESI ─────────────────────────────────────────────────
  const esiEligible = gross <= ESI_WAGE_LIMIT && gross > 0;
  const eeESI = esiEligible ? Math.round(gross * ESI_RATE_EE) : 0;
  const erESI = esiEligible ? Math.round(gross * ESI_RATE_ER) : 0;

  // ── Step 8: Professional Tax ───────────────────────────────────
  const stateCode = getStateCode(p.state || p.workLocationState || "");
  const ptResult  = calcPT(gross, stateCode);

  // ── Step 9: TDS (placeholder) ─────────────────────────────────
  const tds = 0;

  // ── Step 10: Net Salary ────────────────────────────────────────
  const netSalary = gross - eePF - eeESI - ptResult.pt - tds;

  // ── Step 11: Employer Cost (CTC) ──────────────────────────────
  const employerCost = gross + erPFTotal + erESI + edli + pfAdmin;

  // ── EPS age check ──────────────────────────────────────────────
  const age = calcAge(p.dateOfBirth || p.dob || null);
  const epsEligible = age === null ? true : age < EPS_AGE_LIMIT;

  // If age >= 58, EPS goes to EPF entirely
  const effectiveEPS = epsEligible ? erEPS : 0;
  const effectiveEPF = epsEligible ? erEPF : erPFTotal;  // if no EPS, all goes to EPF

  return {
    // Identity
    _id:          p._id,
    personType:   p._personType || "employee",
    employeeId:   p.employeeId   || p.labourId   || "",
    firstName:    p.firstName    || "",
    lastName:     p.lastName     || "",
    uanNumber:    p.uanNumber    || p.pfUan       || "",
    esiNumber:    p.esiNumber    || p.esic        || "",
    panNumber:    p.panNumber    || p.pan         || "",
    workLocationName: p.workLocationName || p.locationName || "",
    state:        p.state        || p.workLocationState    || "",
    stateCode,
    dateOfBirth:  p.dateOfBirth  || p.dob         || null,
    age,

    // Salary breakdown
    basic, da, hra, conv, medical, special, other, bonus, gross,

    // PF
    pfWageRaw, pfWage, pfWageCapped,
    eePF, erPFTotal, erEPF: effectiveEPF, erEPS: effectiveEPS,
    edli, pfAdmin, epsEligible,

    // ESI
    esiEligible, eeESI, erESI,

    // PT
    pt: ptResult.pt, ptMessage: ptResult.message, ptApplicable: ptResult.applicable,

    // Net / CTC
    tds, netSalary, employerCost,
  };
}

module.exports = {
  computeStatutory,
  calcPT,
  calcAge,
  getStateCode,
  PT_SLABS,
  STATE_CODE_MAP,
  PF_WAGE_CAP,
  ESI_WAGE_LIMIT,
};
