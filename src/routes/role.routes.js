import {Router} from "express";

import {upload} from "../middlewares/multer.middleware.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import {createRole} from "../controllers/role.controller.js"
const router = Router();

//create role

router.route("/create").post(createRole)

export default router