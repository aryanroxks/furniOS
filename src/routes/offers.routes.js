import express from "express";
import {
  createOffer,
  updateOffer,
  toggleOfferStatus,
  getAllOffers,
  getOfferById,
  deleteOffer,
} from "../controllers/offers.controller.js";

import {verifyJWT} from "../middlewares/auth.middleware.js";
import {authorizeRoles} from "../middlewares/authorizeRoles.middleware.js"
import { roles } from "../constants.js";

const router = express.Router();

/* =======================
   ADMIN – OFFER MANAGEMENT
   ======================= */
//base url /offers
// Create offer
router.post(
  "/",
  verifyJWT,
  authorizeRoles(roles.admin),
  createOffer
);

// Get all offers (filters + pagination)
router.get(
  "/",
  verifyJWT,
  authorizeRoles(roles.admin),
  getAllOffers
);

// Get single offer
router.get(
  "/:offerId",
  verifyJWT,
  authorizeRoles(roles.admin),
  getOfferById
);

// Update offer
router.put(
  "/:offerId",
  verifyJWT,
  authorizeRoles(roles.admin),
  updateOffer
);

// Toggle offer active/inactive
router.patch(
  "/:offerId/toggle",
  verifyJWT,
  authorizeRoles(roles.admin),
  toggleOfferStatus
);

router.route("/:offerId/delete").delete(verifyJWT,authorizeRoles(roles.admin),deleteOffer)


export default router;
