import {
  getnotifications,
  createNotification,
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

export const Arrivednotification = async (req, res, next) => {
  try {
    const actorUserId = Number(req.user?.user_id ?? req.user?.id);
    const { userId, type, relateId, from_userId } = req.body;
    const recipientUserId = Number(userId);
    const routeActorUserId =
      from_userId === null || from_userId === undefined
        ? actorUserId
        : Number(from_userId);

    if (!Number.isInteger(actorUserId) || actorUserId <= 0) {
      return next(
        new AppError({
          code: "UNAUTHORIZED",
          message: "Usuario no autenticado",
          status: 401,
        })
      );
    }

    if (!Number.isInteger(recipientUserId) || recipientUserId <= 0 || !type) {
      return next(
        new AppError({
          code: "INVALID_NOTIFICATION_DATA",
          message: "Datos de notificacion invalidos",
          status: 400,
        })
      );
    }

    if (Number.isNaN(routeActorUserId) || routeActorUserId !== actorUserId) {
      return next(
        new AppError({
          code: "FORBIDDEN",
          message: "No tienes permiso para crear notificaciones en nombre de otro usuario",
          status: 403,
          details: {
            authenticatedUserId: actorUserId,
            requestedActorUserId: from_userId ?? null,
          },
        })
      );
    }

    const notificationId = await createNotification(
      recipientUserId,
      type,
      relateId,
      actorUserId
    );

    res.status(201).json({
      ok: true,
      message: "Notificacion creada",
      data: notificationId,
    });
  } catch (error) {
    return next(
      new AppError({
        code: "NOTIFICATION_CREATION_FAILED",
        message: "Error al crear la notificacion",
        status: 500,
        details: error?.message || null,
      })
    );
  }
};
