import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { AppError } from "../utils/utils.js";
import { RedisStore } from "rate-limit-redis";
import { getRedisClient } from "../config/redis.js";

const isDev = process.env.NODE_ENV !== "production";


const toInt = (val, fallback)=>{
    const n = parseInt(val, 10)
    return Number.isFinite(n) ? n: fallback
}

export function buildRateLimit({
    windowMs,
    max,
    code,
    message,
    keyGenerator,
    prefix
}) {
    const redisClient = getRedisClient();

    let store;

    if (redisClient) {
    store = new RedisStore({
        prefix: `rl:${prefix}:`,
        sendCommand: (...args) => redisClient.sendCommand(args),
    });
    }

    return rateLimit({
    windowMs,
    max,
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    handler: (req, res, next) => {
        return next(
        new AppError({
            code,
            message,
            status: 429,
            details: isDev
            ? {
                ip: req.ip,
                route: req.originalUrl,
                method: req.method,
                }
            : null,
        })
    );
    },
});
}
const GLOBAL_WINDOW_MS = toInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS, 60000);
const GLOBAL_MAX = toInt(process.env.RATE_LIMIT_GLOBAL_MAX, 120)
const AUTH_WINDOW_MS = toInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 10 * 60_000);
const AUTH_MAX = toInt(process.env.RATE_LIMIT_AUTH_MAX, 7);
const DEV_BYPASS =
    process.env.NODE_ENV === "development" &&
    process.env.RATE_LIMIT_DEV_BYPASS === "true";  // asignar el valor en el .env en "false" para poder probar el rate limit (si el valor es "true" no hay limite)



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

export const rateLimitAuthByUser = DEV_BYPASS
    ? (req, res, next) => next()
    : buildRateLimit({
        windowMs: AUTH_WINDOW_MS,
        max: AUTH_MAX,
        code: "AUTH_RATE_LIMIT_USER_EXCEEDED",
        message: "haz superado el limite de intentos",
        keyGenerator: (req) => 
    req.user 
        ? `user_${req.user.id}` 
        : ipKeyGenerator(req),
    });


export const rateLimitLogin = DEV_BYPASS
    ? (req, res, next) => next()
    : buildRateLimit({
        windowMs: AUTH_WINDOW_MS,
        max: AUTH_MAX,
        code: "LOGIN_RATE_LIMIT_EXCEEDED",
        message: "Too many login attempts. Try again later.",
        keyGenerator: (req) => {
            const email = req.body?.email?.toLowerCase() || "unknown";
            const ipKey = ipKeyGenerator(req);
            return `login_${ipKey}_${email}`;
        }
    });

    /**
 * FUTURO (producción a escala):
 * - Usar Redis como store para rate limit entre múltiples instancias
 * - Ej: express-rate-limit + rate-limit-redis
 * - Así el límite es global incluso si hay 2+ servidores
 */

