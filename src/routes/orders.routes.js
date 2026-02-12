import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { roles } from "../constants.js";
import { assignOrder, createWholesaleOrder,generateOrderInvoice,createOrder, getAllOrders, getFilteredOrders, getMyOrders, getOrder, markOrderDelivered, orderStatus, reassignOrder, cancelOrder } from "../controllers/orders.controller.js";
import {
  createOrderReturn,
  getMyReturnsWithItems,
  getReturnDetails,
  cancelReturnRequest,
  adminGetAllReturns,
  updateReturnStatus,
  adminGetReturnDetails
} from "../controllers/orders_return.controller.js";

const router = Router();

//ROUTES

router.route("/create").post(verifyJWT, authorizeRoles(roles.retail_customer, roles.admin,roles.wholesale_customer), createOrder)
router.patch(
  "/:orderId/status",
  verifyJWT,
  authorizeRoles(roles.admin),
  orderStatus
);

router.post(
  "/wholesale/create",
  verifyJWT,
  authorizeRoles(roles.wholesale_customer),
  createWholesaleOrder
);


router.route("/").get(verifyJWT, authorizeRoles(roles.admin), getFilteredOrders)

// router.route("/").get(verifyJWT, authorizeRoles(roles.admin), getAllOrders)
router.route("/my").get(verifyJWT, authorizeRoles(roles.admin, roles.retail_customer, roles.wholesale_customer), getMyOrders)
router.route("/:orderId/cancel").patch(verifyJWT, authorizeRoles(roles.admin, roles.retail_customer, roles.wholesale_customer), cancelOrder)
router.route("/:orderId").get(verifyJWT, authorizeRoles(roles.admin, roles.retail_customer, roles.wholesale_customer), getOrder)
router.route("/:orderId/assign-order").patch(verifyJWT, authorizeRoles(roles.admin), assignOrder)
router.route("/:orderId/delivered").patch(verifyJWT, authorizeRoles(roles.admin), markOrderDelivered)
router.route("/:orderId/reassign-order").patch(verifyJWT, authorizeRoles(roles.admin), reassignOrder);



//return
//base url /orders
router
  .route("/:orderId/return")
  .post(verifyJWT, createOrderReturn);

router
  .route("/returns/my")
  .get(verifyJWT, getMyReturnsWithItems);

router
  .route("/returns/:returnId")
  .get(verifyJWT, authorizeRoles(roles.retail_customer,roles.wholesale_customer),getReturnDetails);

router
  .route("/returns/:returnId/cancel")
  .patch(verifyJWT, cancelReturnRequest);

router
  .route("/admin/returns")
  .get(
    verifyJWT,
    authorizeRoles(roles.admin),
    adminGetAllReturns
  );
// router.get("/orders/returns/my", verifyJWT, getReturnDetails);


router.get(
  "/admin/returns/:returnId/details",
  verifyJWT,
  authorizeRoles(roles.admin),
  adminGetReturnDetails
);

router
  .route("/admin/returns/:returnId/status")
  .patch(
    verifyJWT,
    authorizeRoles(roles.admin),
    updateReturnStatus
  );

  
router.get(
  "/:orderId/invoice",
  verifyJWT,
  authorizeRoles(roles.admin, roles.retail_customer,roles.wholesale_customer),
  generateOrderInvoice
);



export default router