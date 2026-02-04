import express from "express";
import { createDeliveryPerson,getDeliveryPersons ,getAllDeliveryPersons,deleteDeliveryPerson,toggleDeliveryPersonActive} from "../controllers/delivery_person.controller.js";
import {verifyJWT} from "../middlewares/auth.middleware.js";
import {authorizeRoles} from "../middlewares/authorizeRoles.middleware.js";
import { roles } from "../constants.js";

const router = express.Router();

//base url /delivery-persons
router.route("/").post(verifyJWT,authorizeRoles(roles.admin),createDeliveryPerson)
router.route("/").get(verifyJWT,authorizeRoles(roles.admin),getDeliveryPersons)
router.route("/all").get(verifyJWT,authorizeRoles(roles.admin),getAllDeliveryPersons)
router.patch(
  "/:id",
  verifyJWT,
  authorizeRoles(roles.admin),
  toggleDeliveryPersonActive
);

router.delete(
  "/:id",
  verifyJWT,
  authorizeRoles(roles.admin),
  deleteDeliveryPerson
);

export default router;
