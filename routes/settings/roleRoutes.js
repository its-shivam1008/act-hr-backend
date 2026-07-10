const express = require("express");
const router  = express.Router();

// Placeholder for Role Settings
router.get("/", (req, res) => {
  res.json({ success: true, message: "Roles placeholder route" });
});

module.exports = router;
