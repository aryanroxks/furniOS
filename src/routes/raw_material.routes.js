import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { roles } from "../constants.js";
import {
    deleteRawMaterial, createRawMaterial,
    getAllRawMaterials,
    getRawMaterialById,
    updateRawMaterial,
} from "../controllers/raw_material.controller.js";

const router = Router();

/**
 * Base route: /raw-materials
 * ADMIN ONLY
 */

router.route("/")
    .post(verifyJWT, authorizeRoles(roles.admin), createRawMaterial)
    .get(verifyJWT, authorizeRoles(roles.admin), getAllRawMaterials);

router.route("/:id")
    .get(verifyJWT, authorizeRoles(roles.admin), getRawMaterialById)
    .patch(verifyJWT, authorizeRoles(roles.admin), updateRawMaterial)
    .delete(verifyJWT, authorizeRoles(roles.admin), deleteRawMaterial)



export default router;
