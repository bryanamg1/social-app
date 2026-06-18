import { Data } from "../controllers/monitoringControllers.js";
import { metrics } from "../monitoring/metrics.js";
import express from "express";
const router = express.Router();

router.get("/data", Data);
router.get("/metrics", (req, res) => {
    res.json(metrics);
});

export default router;