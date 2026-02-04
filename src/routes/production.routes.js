import { Router } from "express";

import {
  createProduction,
  updateProduction,
  getProduction,
  getAllProductions,
  startProduction,
  completeProduction,
  cancelProduction,
  deleteProduction
} from "../controllers/production.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { roles } from "../constants.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";

const router = Router();

/* ===============================
   COLLECTION ROUTES
   =============================== */

// Create production
//BASE URL /productions

router.route("/create").post(verifyJWT,authorizeRoles(roles.admin),createProduction)

router.route("/all").get(verifyJWT,authorizeRoles(roles.admin),getAllProductions)

router.route("/:id").get(verifyJWT,authorizeRoles(roles.admin),getProduction)

router.route("/:id").patch(verifyJWT,authorizeRoles(roles.admin),updateProduction)

router.route("/:id/start").post(verifyJWT,authorizeRoles(roles.admin),startProduction)

router.route("/:id/complete").post(verifyJWT,authorizeRoles(roles.admin),completeProduction)

router.route("/:id/cancel").post(verifyJWT,authorizeRoles(roles.admin),cancelProduction)

router
  .route("/:id")
  .delete(
    verifyJWT,
    authorizeRoles(roles.admin),
    deleteProduction
  );


export default router;
