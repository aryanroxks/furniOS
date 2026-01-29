import express from "express";
import { createDeliveryPerson } from "../controllers/delivery_person.controller.js";
import {verifyJWT} from "../middlewares/auth.middleware.js";
import {authorizeRoles} from "../middlewares/authorizeRoles.middleware.js";
import { roles } from "../constants.js";

const router = express.Router();

router.route("/").post(verifyJWT,authorizeRoles(roles.admin),createDeliveryPerson)


export default router;
