const express  = require("express");
const router   = express.Router();
const { employeeProtect } = require("../../middleware/authMiddleware");
const { employeeLogin, getMe } = require("../../controllers/employeePortalController");

router.post("/login", employeeLogin);
router.get("/me", employeeProtect, getMe);

module.exports = router;
