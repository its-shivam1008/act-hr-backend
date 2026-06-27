const express = require("express");
const router = express.Router();
const controller = require("../../controllers/exit/exitController");

const listRoutes = (path, handlers) => {
  router.route(path).get(handlers.getAll).post(handlers.create);
  router.route(`${path}/:id`).put(handlers.update).delete(handlers.remove);
};

listRoutes("/resignations", controller.resignations);
listRoutes("/notice-periods", controller.noticePeriods);
listRoutes("/clearances", controller.clearances);
listRoutes("/interviews", controller.interviews);
listRoutes("/fnf-settlements", controller.fnfSettlements);
listRoutes("/relieving-letters", controller.relievingLetters);
listRoutes("/asset-clearances", controller.assetClearances);

module.exports = router;
