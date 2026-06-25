const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const {
  initiateTransfer,
  getTransfers,
  approveTransfer,
  rejectTransfer,
  getPayrollSplit
} = require("../../controllers/transfers/transferController");

router.use(protect);

router.route("/")
  .post(initiateTransfer)
  .get(getTransfers);

router.put("/:id/approve", approveTransfer);
router.put("/:id/reject", rejectTransfer);

router.get("/payroll-split/:employeeId", getPayrollSplit);

module.exports = router;
