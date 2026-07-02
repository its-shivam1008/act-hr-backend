const InternalWage = require("../../models/payrollModels/InternalWage");
const Labour = require("../../models/Labour");
const Employee = require("../../models/Employee");

// GET /api/internal-wages
exports.getWages = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { location, month, year, type, search } = req.query;

    if (!location || !month || !year || !type) {
      return res.status(400).json({ success: false, message: "Location, Month, Year, and Type are required." });
    }

    const y = Number(year);
    const locLower = location.toLowerCase();
    const isAllLocs = (locLower === "all" || locLower === "all locations");

    // If search parameter is provided, query master directory first
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      if (type === "Labour") {
        const masterQuery = {
          organisationId: orgId,
          "employment.status": "Active",
          $or: [
            { "personalInfo.firstName": regex },
            { "personalInfo.lastName": regex },
            { "employment.climsId": regex },
            { "employment.formA": regex }
          ]
        };
        const labours = await Labour.find(masterQuery).lean();
        
        for (const l of labours) {
          const exists = await InternalWage.findOne({
            organisationId: orgId,
            month,
            year: y,
            type: "Labour",
            labourId: l._id
          });
          if (!exists) {
            const targetLoc = (l.employment?.locationName || location).toLowerCase();
            await InternalWage.create({
              organisationId: orgId,
              type: "Labour",
              labourId: l._id,
              name: `${l.personalInfo?.firstName || ""} ${l.personalInfo?.lastName || ""}`.trim() || "Unnamed Labour",
              formA: l.employment?.formA || "",
              climsId: l.employment?.climsId || "",
              designation: l.employment?.designationName || "",
              agency: l.employment?.agencyName || "",
              rateMonth: l.financial?.monthlyRate || 0,
              rateDay: l.financial?.ratePerDay || 0,
              rateHour: l.financial?.hourlyRate || 0,
              location: targetLoc,
              month,
              year: y,
              bankName: l.banking?.bankName || "",
              branchName: l.banking?.branchName || "",
              ifsc: l.banking?.ifsc || "",
              accountNo: l.banking?.accountNumber || ""
            });
          }
        }
      } else {
        const masterQuery = {
          organisationId: orgId,
          "employment.status": "Active",
          $or: [
            { "personalInfo.firstName": regex },
            { "personalInfo.lastName": regex },
            { "personalInfo.employeeId": regex }
          ]
        };
        const employees = await Employee.find(masterQuery).lean();
        
        for (const e of employees) {
          const exists = await InternalWage.findOne({
            organisationId: orgId,
            month,
            year: y,
            type: "Employee",
            employeeId: e._id
          });
          if (!exists) {
            const targetLoc = (e.employment?.workLocationName || location).toLowerCase();
            await InternalWage.create({
              organisationId: orgId,
              type: "Employee",
              employeeId: e._id,
              name: `${e.personalInfo?.firstName || ""} ${e.personalInfo?.lastName || ""}`.trim() || "Unnamed Employee",
              formA: e.personalInfo?.employeeId || "",
              climsId: "",
              designation: e.employment?.designationName || "",
              department: e.employment?.departmentName || "",
              rateMonth: e.financial?.basicSalary || 0,
              rateDay: Math.round((e.financial?.basicSalary || 0) / 26) || 0,
              location: targetLoc,
              month,
              year: y,
              bankName: e.banking?.bankName || "",
              ifsc: e.banking?.ifscCode || "",
              accountNo: e.banking?.accountNumber || "",
              branchName: ""
            });
          }
        }
      }
    }

    // Build the query to retrieve entries from InternalWage
    const dbQuery = {
      organisationId: orgId,
      month,
      year: y,
      type
    };

    if (!isAllLocs) {
      dbQuery.location = locLower;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      dbQuery.$or = [
        { name: regex },
        { formA: regex },
        { climsId: regex }
      ];
    }

    let wages = await InternalWage.find(dbQuery).populate("employeeId").populate("labourId");

    // If none exist and no search was performed, auto-populate from active master list
    if (wages.length === 0 && (!search || !search.trim())) {
      if (type === "Labour") {
        // Fetch active labours for this location
        const query = {
          organisationId: orgId,
          "employment.status": "Active"
        };
        const labours = await Labour.find(query).lean();
        
        // Filter by location (by name match or ID string match)
        const filtered = labours.filter(l => {
          if (isAllLocs) return true;
          return (
            (l.employment?.locationName && l.employment.locationName.toLowerCase() === locLower) ||
            (l.employment?.locationId && String(l.employment.locationId) === location)
          );
        });

        const newWages = filtered.map(l => ({
          organisationId: orgId,
          type: "Labour",
          labourId: l._id,
          name: `${l.personalInfo?.firstName || ""} ${l.personalInfo?.lastName || ""}`.trim() || "Unnamed Labour",
          formA: l.employment?.formA || "",
          climsId: l.employment?.climsId || "",
          designation: l.employment?.designationName || "",
          agency: l.employment?.agencyName || "",
          rateMonth: l.financial?.monthlyRate || 0,
          rateDay: l.financial?.ratePerDay || 0,
          rateHour: l.financial?.hourlyRate || 0,
          location: (l.employment?.locationName || location).toLowerCase(),
          month,
          year: y,
          bankName: l.banking?.bankName || "",
          branchName: l.banking?.branchName || "",
          ifsc: l.banking?.ifsc || "",
          accountNo: l.banking?.accountNumber || ""
        }));

        if (newWages.length > 0) {
          const inserted = await InternalWage.insertMany(newWages);
          wages = await InternalWage.populate(inserted, [{ path: "employeeId" }, { path: "labourId" }]);
        }
      } else {
        // Fetch active employees
        const query = {
          organisationId: orgId,
          "employment.status": "Active"
        };
        const employees = await Employee.find(query).lean();

        const filtered = employees.filter(e => {
          if (isAllLocs) return true;
          return (
            (e.employment?.workLocationName && e.employment.workLocationName.toLowerCase() === locLower) ||
            (e.employment?.workLocation && String(e.employment.workLocation) === location)
          );
        });

        const newWages = filtered.map(e => ({
          organisationId: orgId,
          type: "Employee",
          employeeId: e._id,
          name: `${e.personalInfo?.firstName || ""} ${e.personalInfo?.lastName || ""}`.trim() || "Unnamed Employee",
          formA: e.personalInfo?.employeeId || "",
          climsId: "",
          designation: e.employment?.designationName || "",
          department: e.employment?.departmentName || "",
          rateMonth: e.financial?.basicSalary || 0,
          rateDay: Math.round((e.financial?.basicSalary || 0) / 26) || 0,
          location: (e.employment?.workLocationName || location).toLowerCase(),
          month,
          year: y,
          bankName: e.banking?.bankName || "",
          ifsc: e.banking?.ifscCode || "",
          accountNo: e.banking?.accountNumber || "",
          branchName: ""
        }));

        if (newWages.length > 0) {
          const inserted = await InternalWage.insertMany(newWages);
          wages = await InternalWage.populate(inserted, [{ path: "employeeId" }, { path: "labourId" }]);
        }
      }
    }

    res.json({ success: true, data: wages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/internal-wages/save
exports.saveWages = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { wages } = req.body;

    if (!Array.isArray(wages)) {
      return res.status(400).json({ success: false, message: "Wages must be an array" });
    }

    const ops = wages.map(item => {
      const { _id, ...fields } = item;
      return {
        updateOne: {
          filter: { _id, organisationId: orgId },
          update: { $set: fields },
          upsert: true
        }
      };
    });

    if (ops.length > 0) {
      await InternalWage.bulkWrite(ops);
    }

    res.json({ success: true, message: "Internal wages saved successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/internal-wages/search-master
// Search active Master list to manually add to current month's payroll sheet
exports.searchMaster = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { type, query, location } = req.query;

    if (!type || !query) {
      return res.status(400).json({ success: false, message: "Type and Query are required." });
    }

    const q = {
      organisationId: orgId,
      $or: [
        { "personalInfo.firstName": { $regex: query, $options: "i" } },
        { "personalInfo.lastName": { $regex: query, $options: "i" } }
      ]
    };

    if (type === "Labour") {
      q["employment.status"] = "Active";
      const labours = await Labour.find(q).lean();
      
      const filtered = labours.filter(l => {
        if (!location || location.toLowerCase() === "all locations" || location.toLowerCase() === "all") return true;
        return (
          (l.employment?.locationName && l.employment.locationName.toLowerCase() === location.toLowerCase()) ||
          (l.employment?.locationId && String(l.employment.locationId) === location)
        );
      });

      res.json({ success: true, data: filtered });
    } else {
      q["employment.status"] = "Active";
      const employees = await Employee.find(q).lean();

      const filtered = employees.filter(e => {
        if (!location || location.toLowerCase() === "all locations" || location.toLowerCase() === "all") return true;
        return (
          (e.employment?.workLocationName && e.employment.workLocationName.toLowerCase() === location.toLowerCase()) ||
          (e.employment?.workLocation && String(e.employment.workLocation) === location)
        );
      });

      res.json({ success: true, data: filtered });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/internal-wages/add-individual
exports.addIndividual = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { targetId, type, location, month, year } = req.body;

    if (!targetId || !type || !location || !month || !year) {
      return res.status(400).json({ success: false, message: "Missing required parameters" });
    }

    const y = Number(year);

    // Check if already in table
    const filter = {
      organisationId: orgId,
      location,
      month,
      year: y,
      type
    };
    if (type === "Labour") {
      filter.labourId = targetId;
    } else {
      filter.employeeId = targetId;
    }

    const existing = await InternalWage.findOne(filter);
    if (existing) {
      return res.status(400).json({ success: false, message: "Already exists in current sheet" });
    }

    let doc;
    if (type === "Labour") {
      const l = await Labour.findById(targetId).lean();
      if (!l) return res.status(404).json({ success: false, message: "Labour not found" });

      doc = new InternalWage({
        organisationId: orgId,
        type: "Labour",
        labourId: l._id,
        name: `${l.personalInfo?.firstName || ""} ${l.personalInfo?.lastName || ""}`.trim(),
        formA: l.employment?.formA || "",
        climsId: l.employment?.climsId || "",
        designation: l.employment?.designationName || "",
        agency: l.employment?.agencyName || "",
        rateMonth: l.financial?.monthlyRate || 0,
        rateDay: l.financial?.ratePerDay || 0,
        rateHour: l.financial?.hourlyRate || 0,
        location,
        month,
        year: y,
        bankName: l.banking?.bankName || "",
        branchName: l.banking?.branchName || "",
        ifsc: l.banking?.ifsc || "",
        accountNo: l.banking?.accountNumber || ""
      });
    } else {
      const e = await Employee.findById(targetId).lean();
      if (!e) return res.status(404).json({ success: false, message: "Employee not found" });

      doc = new InternalWage({
        organisationId: orgId,
        type: "Employee",
        employeeId: e._id,
        name: `${e.personalInfo?.firstName || ""} ${e.personalInfo?.lastName || ""}`.trim(),
        formA: e.personalInfo?.employeeId || "",
        climsId: "",
        designation: e.employment?.designationName || "",
        department: e.employment?.departmentName || "",
        rateMonth: e.financial?.basicSalary || 0,
        rateDay: Math.round((e.financial?.basicSalary || 0) / 26) || 0,
        location,
        month,
        year: y,
        bankName: e.banking?.bankName || "",
        ifsc: e.banking?.ifscCode || "",
        accountNo: e.banking?.accountNumber || "",
        branchName: ""
      });
    }

    await doc.save();
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
