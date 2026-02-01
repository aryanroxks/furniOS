import { Router } from "express";
import {
  createWholesaleQuotation,
  revertWholesaleQuotation,
  approveWholesaleQuotation,
  getWholesaleQuotationDetails,
  getWholesaleQuotationById,
  getMyWholesaleQuotations,
  getAllWholesaleQuotations,
  rejectWholesaleQuotation,
  rejectWholesaleQuotationByAdmin
} from "../controllers/wholesale.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { roles } from "../constants.js";

const router = Router();

/* ======================================================
   WHOLESALE USER ROUTES
   (role: wholesale_customer)
====================================================== */

/**
 * Create wholesale quotation
 * POST /api/wholesale/quotations
 */
router.route("/quotations").post(
  verifyJWT,
  authorizeRoles(roles.wholesale_customer),
  createWholesaleQuotation
);

/**
 * Get my wholesale quotations (LIST)
 * GET /api/wholesale/quotations/my
 */
router.route("/quotations/my").get(
  verifyJWT,
  authorizeRoles(roles.wholesale_customer),
  getMyWholesaleQuotations
);

/**
 * Get wholesale quotation details (OWNED)
 * GET /api/wholesale/quotations/:quotationID
 */
router.route("/quotations/:quotationID").get(
  verifyJWT,
  authorizeRoles(roles.wholesale_customer),
  getWholesaleQuotationDetails
);

/**
 * Approve wholesale quotation
 * POST /api/wholesale/quotations/:quotationID/approve
 */
router.route("/quotations/:quotationID/approve").post(
  verifyJWT,
  authorizeRoles(roles.wholesale_customer),
  approveWholesaleQuotation
);

router.route("/quotations/:quotationID/reject").post(
  verifyJWT,
  authorizeRoles(roles.wholesale_customer),
  rejectWholesaleQuotation
);



/* ======================================================
   ADMIN ROUTES
   (role: admin)
====================================================== */

/**
 * Revert quotation (ADMIN updates prices)
 * PUT /api/wholesale/admin/quotations/:quotationID/revert
 */
router.route("/admin/quotations/:quotationID/revert").put(
  verifyJWT,
  authorizeRoles(roles.admin),
  revertWholesaleQuotation
);

/**
 * Get quotation details (ADMIN view)
 * GET /api/wholesale/admin/quotations/:quotationID
 */
router.route("/admin/quotations/:quotationID").get(
  verifyJWT,
  authorizeRoles(roles.admin),
  getWholesaleQuotationById
);

router.route("/admin/quotations").get(
  verifyJWT,
  authorizeRoles(roles.admin),
  getAllWholesaleQuotations
);


router.route("/admin/quotations/:quotationID/reject").post(
  verifyJWT,
  authorizeRoles(roles.admin),
  rejectWholesaleQuotationByAdmin
);


export default router;
