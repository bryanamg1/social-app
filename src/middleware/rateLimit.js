import rateLimit from "express-rate-limit";
import { AppError } from "../utils/utils.js";

const isDev = process.env.NODE_ENV !== "production";

const toInt = (val, fallback)=>{
    const n = parseInt(val, 10)
    return Number.isFinite(n) ? n: fallback
}

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

const GLOBAL_WINDOW_MS = toInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS, 60000);
const GLOBAL_MAX = toInt(process.env.RATE_LIMIT_GLOBAL_MAX, 120)
const AUTH_WINDOW_MS = toInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 10 * 60_000);
const AUTH_MAX = toInt(process.env.RATE_LIMIT_AUTH_MAX, 10);
const DEV_BYPASS = isDev && process.env.RATE_LIMIT_DEV_BYPASS === "true";  // asignar el valor en el .env en "false" para poder probar el rate limit (si el valor es "true" no hay limite)



export const rateLimitGlobal = DEV_BYPASS
  ? (req, res, next) => next()
  : buildRateLimit({
      windowMs: GLOBAL_WINDOW_MS,
      max: GLOBAL_MAX,
      code: "RATE_LIMIT_EXCEEDED",
      message: "Demasiadas solicitudes. Intenta de nuevo en unos segundos.",
    });

export const rateLimitAuth = DEV_BYPASS
  ? (req, res, next) => next()
  : buildRateLimit({
      windowMs: AUTH_WINDOW_MS,
      max: AUTH_MAX,
      code: "AUTH_RATE_LIMIT_EXCEEDED",
      message: "Demasiados intentos. Intenta nuevamente más tarde.",
    });


    /**
 * FUTURO (producción a escala):
 * - Usar Redis como store para rate limit entre múltiples instancias
 * - Ej: express-rate-limit + rate-limit-redis
 * - Así el límite es global incluso si hay 2+ servidores
 */

