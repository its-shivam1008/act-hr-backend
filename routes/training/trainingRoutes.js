const express = require("express");
const router = express.Router();
const controller = require("../../controllers/training/trainingController");

const listRoutes = (path, handlers) => {
  router.route(path).get(handlers.getAll).post(handlers.create);
  router.route(`${path}/:id`).put(handlers.update).delete(handlers.remove);
};

listRoutes("/programs", controller.programs);
listRoutes("/calendar", controller.calendar);
listRoutes("/attendance-sessions", controller.attendanceSessions);
listRoutes("/participants", controller.participants);
listRoutes("/certifications", controller.certifications);
listRoutes("/safety-modules", controller.safetyModules);
listRoutes("/safety-risks", controller.safetyRisks);
listRoutes("/incidents", controller.incidents);

router.route("/effectiveness").get(controller.effectiveness.get).put(controller.effectiveness.update);
router.route("/skill-gap").get(controller.skillGap.get).put(controller.skillGap.update);

module.exports = router;
