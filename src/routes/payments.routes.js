import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { roles } from "../constants.js";
import { createPayment } from "../controllers/payments.controller.js";

const router = Router();

// COD payment
router.post(
  "/payment",
  verifyJWT,
  authorizeRoles(roles.retail_customer),
  createPayment
);

export default router;
