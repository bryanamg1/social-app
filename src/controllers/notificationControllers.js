import { getnotifications, createNotification, markallseen, markseen } from "../service/notificationService.js";
import {io} from '../app.js';
/* import { AppError } from "../utils/utils.js"; */

export const UserNotifications = async (req, res, next) => {
    try {
        const userId = req.user.user_id;
        const Notification = await getnotifications (userId);
        res.status(200).json({msg:"tienes una notificacion",data: Notification});
    }catch (error) {
        return next(new AppError({
            code: 'NOTIFICATIONS_FETCH_FAILED',
            message: 'Error al obtener las notificaciones',
            statusCode: 500,
            errorDetail: error.message,
        }));
    }
};

export const SeenNotification = async (req, res, next) => {
    try {
        const userId = req.user.user_id;
        const notificationId = parseInt(req.params.notificationId, 10);

        if (isNaN(notificationId)) {
            return next(new AppError({
                code: 'INVALID_NOTIFICATION_ID',
                message: 'ID de notificación inválido',
                statusCode: 400,
            }));
        }
        await markseen(notificationId, userId);
        res.status(200).json({msg:"Notificación vista"});

    }catch (error) {
        return next(new AppError({
            code: 'NOTIFICATION_SEEN_FAILED',
            message: 'Error al marcar la notificación como vista',
            statusCode: 500,
            errorDetail: error.message,
        }))
    }
};

export const SeenAllNotifications = async (req, res, next) => {
    try {
        const userId = req.user.user_id;
        await markallseen(userId);
        res.status(200).json({msg:"notificaciones  vistas"});


        
    } catch (error) {
        return next(new AppError({
            code: 'ALL_NOTIFICATIONS_SEEN_FAILED',
            message: 'Error al marcar todas las notificaciones como vistas',
            statusCode: 500,
            errorDetail: error.message,
        }));
    }
};

export const Arrivednotification = async (req, res, next) => {
    try {
        const { userId, type, relateId, from_userId } = req.body;
        if (!userId || !type) {
            return next(new AppError({
                code: 'INVALID_NOTIFICATION_DATA',
                message: 'Datos de notificación inválidos',
                statusCode: 400,
            }));
        }
        const notificationId = await createNotification(userId, type, relateId, from_userId);
        res.status(201).json({msg:"Notificación creada", data: notificationId});

    } catch (error) {
        return next(new AppError({
            code: 'NOTIFICATION_CREATION_FAILED',
            message: 'Error al crear la notificación',
            statusCode: 500,
            errorDetail: error.message,
        }));
    }
};
