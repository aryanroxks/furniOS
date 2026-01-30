import { Router } from "express";

import {
  createProduction,
  updateProduction,
  getProduction,
  getAllProductions,
  startProduction,
  completeProduction,
  cancelProduction,
} from "../controllers/production.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { roles } from "../constants.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";

const router = Router();

/* ===============================
   COLLECTION ROUTES
   =============================== */

// Create production


router.route("/create").post(verifyJWT,authorizeRoles(roles.admin),createProduction)

router.route("/all").get(verifyJWT,authorizeRoles(roles.admin),getAllProductions)

router.route("/:productionId").get(verifyJWT,authorizeRoles(roles.admin),getProduction)

router.route("/:productionId").patch(verifyJWT,authorizeRoles(roles.admin),updateProduction)

router.route("/:productionId/start").post(verifyJWT,authorizeRoles(roles.admin),startProduction)

router.route("/:productionId/complete").post(verifyJWT,authorizeRoles(roles.admin),completeProduction)

router.route("/:productionId/cancel").post(verifyJWT,authorizeRoles(roles.admin),cancelProduction)


export default router;
