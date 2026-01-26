import express from "express";
import { UserNotifications, SeenNotification,SeenAllNotifications,Arrivednotification } from "../controllers/notificationControllers.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/notifications/user",auth,UserNotifications);
router.patch("/:notificationId/seen",auth,SeenNotification);
router.patch("/seenall",auth,SeenAllNotifications);
router.post("/notification",Arrivednotification);

export default router;