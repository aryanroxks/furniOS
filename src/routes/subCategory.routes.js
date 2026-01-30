import {Router} from "express";

import {upload} from "../middlewares/multer.middleware.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { roles } from "../constants.js";
import { deleteSubCategory, getSubCategoryById, updateSubCategory,getAllSubCategories } from "../controllers/categoryAndSubCategory.controller.js";


const router = Router();


router.route("/update-subcategory/:subCategoryId").patch(verifyJWT,authorizeRoles(roles.admin),updateSubCategory)
router.route("/delete-subcategory/:subCategoryId").delete(verifyJWT,authorizeRoles(roles.admin),deleteSubCategory)
router.route("/:subCategoryId").get(verifyJWT,authorizeRoles(roles.admin,roles.retail_customer),getSubCategoryById)


export default router