import { Router } from "express";
import { generateReport ,downloadReportPDF} from "../controllers/report.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { roles } from "../constants.js";
import { downloadFilteredOrdersPDF } from "../controllers/orders.controller.js";


const router = Router();

/*
  POST /api/admin/reports
  Body decides which report to generate
*/
router.post(
  "/",
  verifyJWT,
  authorizeRoles(roles.admin),
  generateReport
);

router.post("/pdf", verifyJWT, authorizeRoles(roles.admin), downloadReportPDF);
router.get("/pdf", verifyJWT, authorizeRoles(roles.admin), downloadReportPDF);
router.get(
  "/report/pdf",
  verifyJWT,
  authorizeRoles(roles.admin),
  downloadFilteredOrdersPDF
);


export default router;
