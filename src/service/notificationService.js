import db from '../config/db.js';
import {io} from '../app.js';

export const createNotification = async (userId, type,relateId) => {
        const [result] = await db.query(
            'INSERT INTO notifications (user_id, type, relate_id) VALUES (?,?,?)',
            [userId, type, relateId]
        );
            const notificatonId = result.insertId;

            io.of("/notifications").to(`user_${userId}`).emit('notification:new',{id,type,relateId});

            return notificatonId;
}

export const getnotifications = async (userId)=>{
    const [rows] = await db.query(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
    );
    return rows;
}

export const markseen = async (notificationId) =>{
    await db.query(
        'UPDATE notifications SET seen = 1 WHERE id = ?',
        [notificationId]
    );
}

export const markallseen = async (userId) => {
    await db.query(
        'UPDATE notifications SET seen = 1 WHERE user_id = ?',
        [userId]
    );
}
