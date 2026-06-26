import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET;

export const getSocketToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  const headerToken = socket.handshake.headers?.authorization?.replace(
    "Bearer ",
    ""
  );

  return authToken || headerToken || null;
};

export const getSocketUserId = (socket) => {
  return Number(
    socket.data?.user?.user_id ??
      socket.data?.user?.id ??
      socket.data?.user?.user?.id
  );
};

export const authenticateSocket = (socket, next) => {
  const token = getSocketToken(socket);

  if (!token) {
    return next(new Error("SOCKET_UNAUTHORIZED"));
  }

  try {
    const verified = jwt.verify(token, SECRET_KEY);
    socket.data.user = verified.user || verified;
    next();
  } catch {
    next(new Error("SOCKET_UNAUTHORIZED"));
  }
};
