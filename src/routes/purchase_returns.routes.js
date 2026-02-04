import { Router } from "express";
import {
  createPurchaseReturn,
  updatePurchaseReturn,
  deletePurchaseReturn,
  completePurchaseReturn,
  getPurchaseReturns,
  getPurchaseReturnById,
} from "../controllers/purchase_returns.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import {roles} from "../constants.js";

const router = Router();

/* -------------------- COLLECTION ROUTES -------------------- */

//BASE URL /purchase-returns

router
  .route("/")
  .get(
    verifyJWT,
    authorizeRoles(roles.admin),
    getPurchaseReturns
  )
  .post(
    verifyJWT,
    authorizeRoles(roles.admin),
    createPurchaseReturn
  );

/* -------------------- SINGLE RETURN ROUTES -------------------- */

router
  .route("/:returnID")
  .get(
    verifyJWT,
    authorizeRoles(roles.admin),
    getPurchaseReturnById
  )
  .patch(
    verifyJWT,
    authorizeRoles(roles.admin),
    updatePurchaseReturn
  )
  .delete(
    verifyJWT,
    authorizeRoles(roles.admin),
    deletePurchaseReturn
  );

/* -------------------- STATE TRANSITION -------------------- */

router
  .route("/:returnID/complete")
  .post(
    verifyJWT,
    authorizeRoles(roles.admin),
    completePurchaseReturn
  );

export default router;
