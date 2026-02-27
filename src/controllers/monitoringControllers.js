import { getDB } from "../config/db.js";

export const Data = async (req, res, next) => {
    try {
        const db = getDB();
        await db.query("SELECT user_id, user_name, email, created_at FROM users");
        return res.status(200).json({
            estatus: "ok",
            uptime: process.uptime(),
            timestamp: Date.now(),
        });
    } catch (error) {
        console.error("Data error:", error);
        return next(    
            new AppError({
                code: "DATA_FETCH_FAILED",
                message: "Error al obtener los datos",
                status: 500,
                details: error?.code || error?.message || null,
            })
        );
    }       
};