import {
  getnotifications,
  markallseen,
  markseen,
} from "../service/notificationService.js";
import { AppError } from "../utils/utils.js";

export const UserNotifications = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const notifications = await getnotifications(userId);

    res.status(200).json({
      ok: true,
      message: "Notificaciones obtenidas",
      data: notifications,
    });
  } catch (error) {
    return next(
      new AppError({
        code: "NOTIFICATIONS_FETCH_FAILED",
        message: "Error al obtener las notificaciones",
        status: 500,
        details: error?.message || null,
      })
    );
  }
};

export const SeenNotification = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const notificationId = parseInt(req.params.notificationId, 10);

    if (isNaN(notificationId)) {
      return next(
        new AppError({
          code: "INVALID_NOTIFICATION_ID",
          message: "ID de notificacion invalido",
          status: 400,
        })
      );
    }

    const notification = await markseen(notificationId, userId);

    res.status(200).json({
      ok: true,
      message: "Notificacion vista",
      data: notification,
    });
  } catch (error) {
    return next(
      new AppError({
        code: "NOTIFICATION_SEEN_FAILED",
        message: "Error al marcar la notificacion como vista",
        status: 500,
        details: error?.message || null,
      })
    );
  }
};

export const SeenAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const result = await markallseen(userId);

    res.status(200).json({
      ok: true,
      message: "Notificaciones vistas",
      data: result,
    });
  } catch (error) {
    return next(
      new AppError({
        code: "ALL_NOTIFICATIONS_SEEN_FAILED",
        message: "Error al marcar todas las notificaciones como vistas",
        status: 500,
        details: error?.message || null,
      })
    );
  }
};
