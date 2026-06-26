import {getDB} from '../config/db.js';
import { getIO } from '../sockets/sockets.js';

export const NOTIFICATION_TYPES = {
    FOLLOW: "follow",
    COMMENT: "comment",
    REACTION: "reaction",
    MESSAGE: "message",
};

const getNotificationById = async (db, notificationId) => {
    const [rows] = await db.query(
        "SELECT * FROM notifications WHERE id = ? LIMIT 1",
        [notificationId]
    );

    return rows[0] ?? null;
};

export const createNotification = async (userId, type, relateId, from_userId) => {
    const db = getDB();
    const recipientUserId = Number(userId);
    const actorUserId =
        from_userId === null || from_userId === undefined
            ? null
            : Number(from_userId);

    if (
        Number.isNaN(recipientUserId) ||
        !type ||
        (actorUserId !== null && Number.isNaN(actorUserId))
    ) {
        return null;
    }

    if (actorUserId !== null && recipientUserId === actorUserId) {
        return null;
    }

    const [result] = await db.query(
        'INSERT INTO notifications (user_id, type, relate_id, from_userId) VALUES (?,?,?,?)',
        [recipientUserId, type, relateId, actorUserId]
    );

    const notification = await getNotificationById(db, result.insertId);
    const io = getIO();

    io.of("/notifications")
        .to(`user_${recipientUserId}`)
        .emit('notification:new', notification);

    const [[{total}]] = await db.query(
        'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND seen = 0',
        [recipientUserId]
    );

    io.of("/notifications")
        .to(`user_${recipientUserId}`)
        .emit('notification:count', { total });

    return notification?.id ?? result.insertId;
}

export const getnotifications = async (userId)=>{
    const db = getDB();
    const [rows] = await db.query(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
    );
    return rows;
}

export const markseen = async (notificationId, userId) =>{
    const db = getDB();
    await db.query(
        'UPDATE notifications SET seen = 1 WHERE id = ? AND user_id = ?',
        [notificationId, userId]
    );
    const [[{total}]] = await db.query(
        'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND seen = 0',
        [userId]
    );
    const io = getIO();
    io.of("/notifications").to(`user_${userId}`).emit('notification:count', { total });
}

export const markallseen = async (userId) => {
    const db = getDB();
    await db.query(
        'UPDATE notifications SET seen = 1 WHERE user_id = ?',
        [userId]
    );
    const io = getIO();
    io.of("/notifications").to(`user_${userId}`).emit('notification:count', 0);
}
