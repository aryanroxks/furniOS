import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { roles } from "../constants.js";

import {
  createFeedback,
  updateMyFeedback,
  deleteMyFeedback,
  getMyFeedbacks,
  getProductFeedbacks,
  getProductRatingSummary,
} from "../controllers/feedback.controller.js";

const router = Router();

/* ================= USER ROUTES ================= */

// create feedback for a product
router
  .route("/:productId")
  .post(verifyJWT, authorizeRoles(roles.admin,roles.wholesale_customer,roles.retail_customer), createFeedback);

// update own feedback
router
  .route("/my/:feedbackId")
  .patch(verifyJWT, authorizeRoles(roles.admin,roles.wholesale_customer,roles.retail_customer), updateMyFeedback);

// delete own feedback
router
  .route("/my/:feedbackId")
  .delete(verifyJWT, authorizeRoles(roles.admin,roles.wholesale_customer,roles.retail_customer), deleteMyFeedback);

// get my feedbacks
router
  .route("/my")
  .get(verifyJWT, authorizeRoles(roles.admin,roles.wholesale_customer,roles.retail_customer), getMyFeedbacks);


/* ================= PUBLIC ROUTES ================= */

// get product feedbacks
router
  .route("/product/:productId")
  .get(getProductFeedbacks);

// get product rating summary
router
  .route("/product/:productId/summary")
  .get(getProductRatingSummary);

export default router;
