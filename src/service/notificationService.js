import {getDB} from '../config/db.js';
import { getIO } from '../sockets/sockets.js';

export const NOTIFICATION_TYPES = Object.freeze({
    FOLLOW_USER: "FOLLOW_USER",
    COMMENT_POST: "COMMENT_POST",
    REACTION_POST: "REACTION_POST",
    REACTION_COMMENT: "REACTION_COMMENT",
    REPLY_COMMENT: "REPLY_COMMENT",
    REPOST: "REPOST",
    MENTION_USER: "MENTION_USER",
    MESSAGE: "MESSAGE",
});

const LEGACY_NOTIFICATION_TYPE_ALIASES = Object.freeze({
    follow: NOTIFICATION_TYPES.FOLLOW_USER,
    comment: NOTIFICATION_TYPES.COMMENT_POST,
    reaction: NOTIFICATION_TYPES.REACTION_POST,
    message: NOTIFICATION_TYPES.MESSAGE,
});

const VALID_NOTIFICATION_TYPES = new Set(Object.values(NOTIFICATION_TYPES));

export const normalizeNotificationType = (type) => {
    const rawType = String(type ?? "").trim();

    if (!rawType) {
        return "";
    }

    if (VALID_NOTIFICATION_TYPES.has(rawType)) {
        return rawType;
    }

    return LEGACY_NOTIFICATION_TYPE_ALIASES[rawType.toLowerCase()] ?? rawType;
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
    const normalizedType = normalizeNotificationType(type);
    const actorUserId =
        from_userId === null || from_userId === undefined
            ? null
            : Number(from_userId);

    if (
        Number.isNaN(recipientUserId) ||
        !normalizedType ||
        !VALID_NOTIFICATION_TYPES.has(normalizedType) ||
        (actorUserId !== null && Number.isNaN(actorUserId))
    ) {
        return null;
    }

    if (actorUserId !== null && recipientUserId === actorUserId) {
        return null;
    }

    const [result] = await db.query(
        'INSERT INTO notifications (user_id, type, relate_id, from_userId) VALUES (?,?,?,?)',
        [recipientUserId, normalizedType, relateId, actorUserId]
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
    const notification = await getNotificationById(db, notificationId);
    const [[{total}]] = await db.query(
        'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND seen = 0',
        [userId]
    );
    const io = getIO();
    io.of("/notifications").to(`user_${userId}`).emit('notification:count', { total });
    return notification;
}

export const markallseen = async (userId) => {
    const db = getDB();
    const [result] = await db.query(
        'UPDATE notifications SET seen = 1 WHERE user_id = ?',
        [userId]
    );
    const io = getIO();
    io.of("/notifications").to(`user_${userId}`).emit('notification:count', { total: 0 });
    return {
        affectedRows: result?.affectedRows ?? 0,
    };
}
