import {Router} from "express";
// import {upload} from "../middlewares/multer.middleware.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { createCategory, deleteCategory, getCategories, updateCategory, getCategoryById, createSubCategory, getSubCategories} from "../controllers/categoryAndSubCategory.controller.js";
import { roles } from "../constants.js";

const router=Router();

//routes
//Category
router.route("/create-category").post(verifyJWT,authorizeRoles(roles.admin),createCategory)
router.route("/update-category/:categoryId").patch(verifyJWT,authorizeRoles(roles.admin),updateCategory)
router.route("/delete-category/:categoryId").delete(verifyJWT,authorizeRoles(roles.admin),deleteCategory)
router.route("/").get(verifyJWT,authorizeRoles(roles.admin),getCategories)
router.route("/:categoryId").get(verifyJWT,authorizeRoles(roles.admin),getCategoryById)


//Sub category routes

router.route("/:categoryId/create-subcategory").post(verifyJWT,authorizeRoles(roles.admin),createSubCategory)
router.route("/:categoryId/subcategories").get(verifyJWT,authorizeRoles(roles.admin),getSubCategories)


export default router