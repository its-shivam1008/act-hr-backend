const express  = require("express");
const router   = express.Router();
const { employeeProtect } = require("../../middleware/authMiddleware");
const { employeeLogin, getMe, getTransfers } = require("../../controllers/employeePortalController");

router.post("/login", employeeLogin);
router.get("/me", employeeProtect, getMe);
router.get("/transfers", employeeProtect, getTransfers);

module.exports = router;
