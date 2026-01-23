import db from '../config/db.js';
import {io} from '../app.js';

export const createNotification = async (userId, type,relateId,from_userId) => {
        const [result] = await db.query(
            'INSERT INTO notifications (user_id, type, relate_id, from_userId) VALUES (?,?,?,?)',
            [userId, type, relateId,from_userId]
        );
            const notificationId = result.insertId;
            const notification = { id: notificationId, type, relateId, from_userId };

            io.of("/notifications").to(`user_${userId}`).emit('notification:new', notification);

        const [[{total}]] = await db.query(
            'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND seen = 0',
            [userId]
        );
        io.of("/notifications").to(`user_${userId}`).emit('notification:count', { total });

            return notificationId;
}

export const getnotifications = async (userId)=>{
    const [rows] = await db.query(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
    );
    return rows;
}

export const markseen = async (notificationId, userId) =>{
    await db.query(
        'UPDATE notifications SET seen = 1 WHERE id = ? AND user_id = ?',
        [notificationId, userId]
    );
    const [[{total}]] = await db.query(
        'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND seen = 0',
        [userId]
    );
    io.of("/notifications").to(`user_${userId}`).emit('notification:count', { total });
}

export const markallseen = async (userId) => {
    await db.query(
        'UPDATE notifications SET seen = 1 WHERE user_id = ?',
        [userId]
    );
    io.of("/notifications").to(`user_${userId}`).emit('notification:count', 0);
}
