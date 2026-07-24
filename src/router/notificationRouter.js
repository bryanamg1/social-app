import express from "express";
import {
  GetNotificationPreferences,
  UpdateNotificationPreferences,
  UserNotifications,
  SeenNotification,
  SeenAllNotifications,
} from "../controllers/notificationControllers.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/", auth, UserNotifications);
router.get("/preferences", auth, GetNotificationPreferences);
router.patch("/preferences", auth, UpdateNotificationPreferences);
router.patch("/:notificationId/seen", auth, SeenNotification);
router.patch("/seen-all", auth, SeenAllNotifications);

export default router;
