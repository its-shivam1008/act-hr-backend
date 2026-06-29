const express = require("express");
const router  = express.Router();
const {
  getSettings,
  createSetting,
  updateSetting,
  deleteSetting
} = require("../../controllers/settings/customSettingController");

router.get   ("/",    getSettings);
router.post  ("/",    createSetting);
router.put   ("/:id", updateSetting);
router.delete("/:id", deleteSetting);

module.exports = router;
