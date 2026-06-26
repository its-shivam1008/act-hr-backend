const express  = require("express");
const router   = express.Router();
const { employeeProtect } = require("../../middleware/authMiddleware");
const {
  employeeLogin,
  getMe,
  getTransfers,
  applyTransfer,
  getEmployeeMasterData,
  applyRegularization,
  getEmployeeRegularizations
} = require("../../controllers/employeePortalController");

router.post("/login", employeeLogin);
router.get("/me", employeeProtect, getMe);

router.get("/transfers", employeeProtect, getTransfers);
router.post("/transfers", employeeProtect, applyTransfer);

router.get("/masterdata", employeeProtect, getEmployeeMasterData);

router.get("/regularizations", employeeProtect, getEmployeeRegularizations);
router.post("/regularizations", employeeProtect, applyRegularization);

module.exports = router;
