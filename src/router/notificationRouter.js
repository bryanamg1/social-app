import express from "express";
import {
  UserNotifications,
  SeenNotification,
  SeenAllNotifications,
} from "../controllers/notificationControllers.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/", auth, UserNotifications);
router.get("/notifications/user", auth, UserNotifications);
router.patch("/:notificationId/seen", auth, SeenNotification);
router.patch("/seen-all", auth, SeenAllNotifications);
router.patch("/seenall", auth, SeenAllNotifications);

export default router;
