import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { roles } from "../constants.js";

import {
  createInquiry,
  getMyInquiries,
  getMyInquiryById,
  closeMyInquiry,
  getAllInquiries,
  getInquiryByIdAdmin,
  updateInquiryStatus,
  replyToInquiry,
  deleteInquiryAdmin,
} from "../controllers/inquiry.controller.js";

const router = Router();

/* ================= USER ROUTES ================= */

// create inquiry / complaint

//base url /inquiries
router
  .route("/")
  .post(verifyJWT, authorizeRoles(roles.retail_customer,roles.admin,roles.wholesale_customer), createInquiry);

// get my inquiries
router
  .route("/my")
  .get(verifyJWT, authorizeRoles(roles.retail_customer,roles.admin,roles.wholesale_customer), getMyInquiries);

// get single inquiry (my)
router
  .route("/my/:inquiryId")
  .get(verifyJWT, authorizeRoles(roles.retail_customer,roles.admin,roles.wholesale_customer), getMyInquiryById);

// close inquiry (my)
router
  .route("/my/:inquiryId/close")
  .patch(verifyJWT, authorizeRoles(roles.retail_customer,roles.admin,roles.wholesale_customer), closeMyInquiry);


/* ================= ADMIN ROUTES ================= */

// get all inquiries
router
  .route("/admin")
  .get(verifyJWT, authorizeRoles(roles.admin), getAllInquiries);

// get single inquiry (admin)
router
  .route("/admin/:inquiryId")
  .get(verifyJWT, authorizeRoles(roles.admin), getInquiryByIdAdmin);

// update inquiry status
router
  .route("/admin/:inquiryId/status")
  .patch(verifyJWT, authorizeRoles(roles.admin), updateInquiryStatus);

// reply to inquiry
router
  .route("/admin/:inquiryId/reply")
  .patch(verifyJWT, authorizeRoles(roles.admin), replyToInquiry);

// delete inquiry
router
  .route("/admin/:inquiryId")
  .delete(verifyJWT, authorizeRoles(roles.admin), deleteInquiryAdmin);

export default router;
