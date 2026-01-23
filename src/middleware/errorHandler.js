import { AppError } from "../utils/utils.js";

const isDev = process.env.NODE_ENV !== "production";

export const errorHandler = (err, req, res, next) => {
  const error =
    err instanceof AppError
      ? err
      : new AppError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Ocurrió un error inesperado.",
          status: 500,
          details: isDev ? err?.message : null,
        });

  // Log técnico (backend)
  console.error("❌ API ERROR:", {
    code: error.code,
    status: error.status,
    message: error.message,
    route: req.originalUrl,
    method: req.method,
    details: error.details,
  });

  // Respuesta estandarizada al frontend
  res.status(error.status).json({
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      details: isDev ? error.details : null,
    },
  });
};