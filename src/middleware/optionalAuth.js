import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET;

const optionalAuth = (req, _res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    next();
    return;
  }

  try {
    const verified = jwt.verify(token, SECRET_KEY);
    req.user = verified.user || verified;
  } catch {
    req.user = undefined;
  }

  next();
};

export default optionalAuth;
