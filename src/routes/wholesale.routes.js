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
  rejectWholesaleQuotationByAdmin,
  updateWholesaleQuotation
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
 * Base url /wholesale
 */
router.route("/quotations").post(
  verifyJWT,
  authorizeRoles(roles.wholesale_customer),
  createWholesaleQuotation
);


router.route("/quotations/my").get(
  verifyJWT,
  authorizeRoles(roles.wholesale_customer),
  getMyWholesaleQuotations
);


router.route("/quotations/:quotationID").get(
  verifyJWT,
  authorizeRoles(roles.wholesale_customer),
  getWholesaleQuotationDetails
);


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

router.put(
  "/quotations/:quotationID/modify",
  verifyJWT,
  authorizeRoles(roles.wholesale_customer),
  updateWholesaleQuotation
);

/* ======================================================
   ADMIN ROUTES
   (role: admin)
====================================================== */


router.route("/admin/quotations/:quotationID/revert").put(
  verifyJWT,
  authorizeRoles(roles.admin),
  revertWholesaleQuotation
);

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
