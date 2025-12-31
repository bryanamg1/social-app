import upload from "../middleware/upload.js";

export const optionalUpload = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";

  if (contentType.startsWith("multipart/form-data")) {
    upload.single("image")(req, res, (err) => {
      if (err) {
        console.error("❌ Error en Multer:", err);
        return res.status(400).json({ error: "Error al procesar archivo" });
      }
      next();
    });

  } else {
    next(); // No es form-data, seguimos normal
  }
};