import multer from "multer"
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js"


const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "social-app",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(
        new Error("Formato inválido. Solo se permiten JPG, PNG o WEBP")
      );
    }
    cb(null, true);
  },
});

export default upload;