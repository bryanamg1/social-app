import multer from "multer";
import upload from "../middleware/upload.js";

export const optionalUpload = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";

  if (!contentType.startsWith("multipart/form-data")) {
    return next(); // No hay archivo → seguimos normal
  }

  upload.single("image")(req, res, (err) => {
    if (!err) return next();

    console.error("❌ Error en Multer:", err);

    // 🔴 Archivo demasiado grande
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: "Archivo demasiado grande",
        message: "El peso máximo permitido es 10MB",
        maxSizeMB: 10,
      });
    }

    // 🔴 Error de formato u otro error de Multer
    return res.status(400).json({
      error: "Error al procesar archivo",
      message: err.message,
    });
  });
};


export class AppError extends Error {
  constructor({ code, message, status = 500, details = null }) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}