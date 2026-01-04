import {Router} from "express";
// import {upload} from "../middlewares/multer.middleware.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { createCategory, updateCategory } from "../controllers/categoryAndSubCategory.controller.js";
import { roles } from "../constants.js";

const router=Router();

//routes

router.route("/add-category").post(verifyJWT,authorizeRoles(roles.admin),createCategory)
router.route("/update-category/:id").patch(verifyJWT,authorizeRoles(roles.admin),updateCategory)

export default router