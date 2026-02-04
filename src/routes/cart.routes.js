import {Router} from "express";
import {verifyJWT} from "../middlewares/auth.middleware.js"
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { roles } from "../constants.js";
import { addProductToCart, decreaseQuantity, getCart, removeProductFromCart } from "../controllers/cart.controller.js";

const router=Router();

router.route("/add").post(verifyJWT,authorizeRoles(roles.retail_customer,roles.admin,roles.wholesale_customer),addProductToCart)
router.route("/remove").delete(verifyJWT,authorizeRoles(roles.retail_customer,roles.admin,roles.wholesale_customer),removeProductFromCart)
router.route("/decrease").patch(verifyJWT,authorizeRoles(roles.retail_customer,roles.admin,roles.wholesale_customer),decreaseQuantity)
router.route("/").get(verifyJWT,authorizeRoles(roles.retail_customer,roles.admin,roles.wholesale_customer),getCart)


export default router