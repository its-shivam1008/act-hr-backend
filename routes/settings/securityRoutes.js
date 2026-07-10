const express = require("express");
const router  = express.Router();

// Placeholder for Security Settings
router.get("/", (req, res) => {
  res.json({ success: true, message: "Security placeholder route" });
});

module.exports = router;
