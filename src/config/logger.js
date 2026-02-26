import winston from "winston";

const { combine, timestamp, json, errors, printf } = winston.format;

const isDev = process.env.NODE_ENV !== "production";

const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    return `${timestamp} [${level}] ${message}${stack ? `\n${stack}` : ""}
    ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""}`;
});

export const logger = winston.createLogger({
    level: isDev ? "debug" : "info",
    format: combine(
        timestamp(),
        errors({ stack: true }),
        isDev ? devFormat : json()
    ),
        transports: [
    new winston.transports.File({
    filename: "logs/error.log",
    level: "error",
    }),
    new winston.transports.File({
    filename: "logs/combined.log",
    }),
],
});
if (isDev) {
    logger.add(
    new winston.transports.Console({
        format: devFormat,
        })
    );
}