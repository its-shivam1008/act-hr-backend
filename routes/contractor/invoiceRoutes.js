const express = require("express");
const router  = express.Router();
const { protect } = require("../../middleware/authMiddleware");

const {
  getInvoices,
  createInvoice,
  updateInvoiceStatus,
  deleteInvoice
} = require("../../controllers/contractor/invoiceController");

// All routes require authentication
router.use(protect);

router.route("/")
  .get(getInvoices)
  .post(createInvoice);

router.route("/:id")
  .delete(deleteInvoice);

router.route("/:id/status")
  .patch(updateInvoiceStatus);

module.exports = router;
