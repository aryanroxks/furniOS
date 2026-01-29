import { Router } from "express";
import {
  createVendor,
  getAllVendors,
  getVendorById,
  updateVendor,
  toggleVendorStatus,
} from "../controllers/vendor.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { roles } from "../constants.js";

const router = Router();

/**
 * Base route: /api/v1/vendors
 * ADMIN ONLY
 */

router.route("/")
  .post(verifyJWT, authorizeRoles(roles.admin), createVendor)
  .get(verifyJWT, authorizeRoles(roles.admin), getAllVendors);

router.route("/:id")
  .get(verifyJWT, authorizeRoles(roles.admin), getVendorById)
  .patch(verifyJWT, authorizeRoles(roles.admin), updateVendor);

router.route("/:id/status")
  .patch(verifyJWT, authorizeRoles(roles.admin), toggleVendorStatus);

export default router;
