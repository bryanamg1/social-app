import rateLimit from "express-rate-limit";
import { AppError } from "../utils/utils.js";

const isDev = process.env.NODE_ENV !== "production";

function buildRateLimit({windowMs, max, code, message}){
    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: null,
        handler: (req, res, next)=>{
            return next(
                new AppError({
                    code,
                    message,
                    status: 429,
                    details: isDev ? {ip: req.ip, route: req.originalUrl, method: req.method} : null
                })
            )
        }
    })
}

export const rateLimitGlobal = buildRateLimit({
    windowMs: 1 * 60 * 1000,
    max: 120,
    code: "RATE_LIMIT_EXCEEDED",
    message: "Demasiadas solicitudes. Intenta de nuevo en unos segundos."
})

export const rateLimitAuth = buildRateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    cocode: "AUTH_RATE_LIMIT_EXCEEDED",
    message: "Demasiados intentos. Intenta nuevamente más tarde"
})

