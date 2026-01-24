import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { roles } from "../constants.js";
import { createProduct, updateProduct, deleteProduct , removeMedia, addMedia, replaceMedia, getProducts, getProductById, getProductsBySubCategory } from "../controllers/products.controller.js";

const router = Router()

//ROUTES

router.route("/create-product")
  .post(
    upload.fields([
      { name: "images", maxCount: 10 },
      { name: "videos", maxCount: 2 }
    ]),
    verifyJWT,
    authorizeRoles(roles.admin),
    createProduct
  );

router.route("/:productId/add-media")
  .post(
    upload.fields([
      { name: "images", maxCount: 10 },
      { name: "videos", maxCount: 2 }
    ]), 
    verifyJWT,
    authorizeRoles(roles.admin),
    addMedia
  );
  //replace
router.route("/:productId/replace-media")
  .put(
    upload.single("media"), 
    verifyJWT,
    authorizeRoles(roles.admin),
    replaceMedia
  );

router.route("/update-product/:productId").patch(verifyJWT,authorizeRoles(roles.admin),updateProduct)
router.route("/:productId/remove-media").delete(verifyJWT,authorizeRoles(roles.admin),removeMedia)
router.route("/delete-product/:productId").delete(verifyJWT, authorizeRoles(roles.admin), deleteProduct)

router.route("/").get(getProducts)
router.route("/:productId").get(getProductById)
router.route("/subcategory/:subCategoryId/").get(verifyJWT,authorizeRoles(roles.admin,roles.retail_customer,roles.wholesale_customer),getProductsBySubCategory)



export default router