import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { roles } from "../constants.js";
import { createPayment,verifyPayment ,markPaymentSuccess,getPayments} from "../controllers/payments.controller.js";

const   router = Router();

// COD payment
router.post(
  "/payment",
  verifyJWT,  
  createPayment
);

router.get("/", getPayments);


router.post("/verify", (req, res, next) => {
  console.log("VERIFY ROUTE HIT");
  next();
}, verifyPayment);

router.post("/success", markPaymentSuccess);



export default router;
