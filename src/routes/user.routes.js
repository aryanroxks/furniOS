import {Router} from "express";

import {upload} from "../middlewares/multer.middleware.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import {changeCurrentPassword, getCurrentUser, logInUser, logOutUser, refreshAccessToken, registerRetailUser,registerWholesaleUser,updateAccountDetails} from "../controllers/user.controller.js"

const router = Router();

router.route("/register/retail-customer").post(registerRetailUser)
router.route("/register/wholesale-customer").post(registerWholesaleUser)
router.route("/login").post(logInUser)


//SECURED 
router.route("/refresh-token").post(refreshAccessToken)
router.route("/logout").post(verifyJWT,logOutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT,changeCurrentPassword)
router.route("/current-user").get(verifyJWT,getCurrentUser)
router.route("/update-account").patch(verifyJWT,updateAccountDetails)





export default router