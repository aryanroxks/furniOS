import {Router} from "express";
import {verifyJWT} from "../middlewares/auth.middleware.js"
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { roles } from "../constants.js";
import { addProduct, getWishlist, removeProduct, removeWishlist } from "../controllers/wishlist.controller.js";

const router = Router();

router.route("/wishlist").get(verifyJWT,authorizeRoles(roles.retail_customer,roles.wholesale_customer,roles.admin),getWishlist)
router.route("/wishlist").post(verifyJWT,authorizeRoles(roles.retail_customer,roles.wholesale_customer,roles.admin),addProduct)
router.route("/wishlist/:productId").delete(verifyJWT,authorizeRoles(roles.retail_customer,roles.wholesale_customer,roles.admin),removeProduct)
router.route("/wishlist").delete(verifyJWT,authorizeRoles(roles.retail_customer,roles.wholesale_customer,roles.admin),removeWishlist)

export default router