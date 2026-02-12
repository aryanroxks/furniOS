import { Router } from "express";

import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { changeCurrentPassword,downloadUsersPDF,adminUpdateUser,getCurrentUser, logInUser, logOutUser, updateProfileRequest, deleteUser, verifyEmailOTP, refreshAccessToken, registerRetailUser, registerWholesaleUser, registerDeliveryPerson, forgotPasswordRequest, verifyForgotPasswordOTP, getAllUsers, getUserById } from "../controllers/user.controller.js"
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { roles } from "../constants.js"
import { getNotActivatedDeliveryUsers } from "../controllers/delivery_person.controller.js";
const router = Router();

router.route("/register/retail-customer").post(registerRetailUser)
router.route("/register/wholesale-customer").post(registerWholesaleUser)
router.route("/register/delivery-person").post(verifyJWT, authorizeRoles(roles.admin), registerDeliveryPerson)
router.route("/login").post(logInUser)
router.route("/current-user").get(verifyJWT, getCurrentUser)

// SECURED
router.route("/all").get(
  verifyJWT,
  authorizeRoles(roles.admin),
  getAllUsers
);

router.get(
  "/pdf",
  verifyJWT,
  authorizeRoles(roles.admin),
  downloadUsersPDF
);


router.route("/refresh-token").post(refreshAccessToken)
router.route("/logout").post(verifyJWT, logOutUser)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
// router.route("/update-account").patch(verifyJWT,updateAccountDetails)
// PROFILE UPDATE WITH EMAIL OTP
router.route("/update-profile").patch(
  verifyJWT,
  updateProfileRequest
)

router.route("/verify-email-otp").post(
  verifyJWT,
  verifyEmailOTP
)

router.post(
  "/forgot-password",
  forgotPasswordRequest
)

// Reset password using OTP
router.post(
  "/reset-password",
  verifyForgotPasswordOTP
)



// router.route("/:id").get(
//   verifyJWT,
//   authorizeRoles(roles.admin),
//   getUserById
// );

router.get(
  "/delivery-persons/not-activated",
  verifyJWT,
  authorizeRoles(roles.admin),
  getNotActivatedDeliveryUsers
);



//base url /users



router.patch(
  "/admin/:id",
  verifyJWT,
  authorizeRoles(roles.admin),
  adminUpdateUser
);

router.route("/:id").get(
  verifyJWT,
  authorizeRoles(roles.admin),
  getUserById
);




router.route("/:id").delete(verifyJWT,authorizeRoles(roles.admin),deleteUser)


export default router