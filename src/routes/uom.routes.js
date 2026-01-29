import { Router } from "express";
import {
  createUOM,
  getAllUOMs,
  updateUOM,
  deleteUOM,
} from "../controllers/uom.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { roles } from "../constants.js";

const router = Router();

/**
 * Base route: /api/v1/uoms
 * ADMIN ONLY
 */

router.route("/")
  .post(verifyJWT, authorizeRoles(roles.admin), createUOM)
  .get(verifyJWT, authorizeRoles(roles.admin), getAllUOMs);

router.route("/:id")
  .patch(verifyJWT, authorizeRoles(roles.admin), updateUOM)
  .delete(verifyJWT, authorizeRoles(roles.admin), deleteUOM);

export default router;
