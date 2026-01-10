import {Router} from "express";
import {upload} from "../middlewares/multer.middleware.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { roles } from "../constants.js";
import { createProduct } from "../controllers/products.controller.js";

const router = Router()

router.route("/create-product")
  .post(
    upload.fields([
      { name: "images", maxCount: 10 },
      { name: "videos", maxCount: 5 }
    ]),
    verifyJWT,
    authorizeRoles(roles.admin),
    createProduct
  );


export default router