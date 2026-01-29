import rateLimit from "express-rate-limit";
import { AppError } from "../utils/utils.js";

const isDev = process.env.NODE_ENV !== "production";

export const rateLimitGlobal = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: null,
    handler: (req, res, next)=>{
        return next(
            new AppError({
                code: "RATE_LIMIT_EXCEEDED",
                message: "Demasiadas solicitudes. Intenta de nuevo en unos segundos.",
                status: 429,
                details: isDev
                ?{ip: req.ip, route: req.originalUrl, method: req.method}
                :null
            })
        )
    }
})