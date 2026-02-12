import { Router } from "express";
import {
    createPurchase,
    getAllPurchases,
    getPurchaseById,
    updatePurchase,
    receivePurchase,
    cancelPurchase,
    deletePurchase,generatePurchaseInvoice,
    downloadPurchasesPDF
} from "../controllers/purchase.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { roles } from "../constants.js";

const router = Router();

/**
 * ADMIN ONLY
 * Base route: /purchases
 */

// Create purchase
router.route("/")
    .post(
        verifyJWT,
        authorizeRoles(roles.admin),
        createPurchase
    )
    .get(
        verifyJWT,
        authorizeRoles(roles.admin),
        getAllPurchases
    );

router.get(
  "/pdf",
  verifyJWT,
  authorizeRoles(roles.admin),
  downloadPurchasesPDF
);

// Get / Update purchase by ID
router.route("/:id")
    .get(
        verifyJWT,
        authorizeRoles(roles.admin),
        getPurchaseById
    )
    .patch(
        verifyJWT,
        authorizeRoles(roles.admin),
        updatePurchase
    );

// Receive purchase
router.route("/:id/receive")
    .patch(
        verifyJWT,
        authorizeRoles(roles.admin),
        receivePurchase
    );

// Cancel purchase
router.route("/:id/cancel")
    .patch(
        verifyJWT,
        authorizeRoles(roles.admin),
        cancelPurchase
    );


// Delete purchase (ONLY PENDING)
router.route("/:id")
  .delete(
    verifyJWT,
    authorizeRoles(roles.admin),
    deletePurchase
  );

router.get(
    "/:id/invoice",
    verifyJWT,
    authorizeRoles(roles.admin),
    generatePurchaseInvoice
);



export default router;
