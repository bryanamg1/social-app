import { Router } from "express";

import auth from "../middleware/auth.js";
import {
  createReport,
  getMyReports,
  getReportsQueue,
  updateReportStatus,
} from "../controllers/reportController.js";

const router = Router();

router.post("/", auth, createReport);
router.get("/mine", auth, getMyReports);
router.get("/queue", auth, getReportsQueue);
router.patch("/:reportId/status", auth, updateReportStatus);

export default router;
