import { Router } from "express";
import {
    getDashboardStats,
    getDashboardRevenueTrend,
    getDashboardCategorySales,
    getDashboardSubCategorySales
} from "../controllers/dashboard.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { roles } from "../constants.js"
const router = Router();



router.get(
    "/stats",
    verifyJWT,
    authorizeRoles(roles.admin),
    getDashboardStats
);

router.get(
    "/revenue-trend",
    verifyJWT,
    authorizeRoles(roles.admin),
    getDashboardRevenueTrend
);

router.get(
    "/category-sales",
    verifyJWT,
    authorizeRoles(roles.admin),
    getDashboardCategorySales
);

router.get(
    "/subcategory-sales",
    verifyJWT,
    authorizeRoles(roles.admin),
    getDashboardSubCategorySales
);




export default router;