import dotenv from "dotenv";
import jwt from "jsonwebtoken";

import { getDB } from "../config/db.js";
import { insertMessage } from "../service/messageService.js";
import { userBelongsToConversation } from "../service/conversationsService.js";

dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET;

const getSocketToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  const headerToken = socket.handshake.headers?.authorization?.replace(
    "Bearer ",
    ""
  );

  return authToken || headerToken || null;
};

const getSocketUserId = (socket) => {
  return Number(
    socket.data?.user?.user_id ??
      socket.data?.user?.id ??
      socket.data?.user?.user?.id
  );
};

export const registerMessagesSocket = (io) => {
  const db = getDB();
  const nsp = io.of("/messages");

  nsp.use((socket, next) => {
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
  });

  nsp.on("connection", (socket) => {
    console.log("Usuario conectado a /messages");

    socket.on("messages:join", async ({ conversation_id }) => {
      try {
        const conversationId = parseInt(conversation_id, 10);
        const userId = getSocketUserId(socket);

        if (Number.isNaN(conversationId) || Number.isNaN(userId)) {
          return socket.emit("messages:error", {
            code: "JOIN_PARAMS_INVALID",
            message: "Invalid conversation_id or authenticated user",
          });
        }

        const allowed = await userBelongsToConversation(db, conversationId, userId);
        if (!allowed) {
          return socket.emit("messages:error", {
            code: "JOIN_FORBIDDEN",
            message: "No perteneces a esta conversacion",
          });
        }

        socket.join(`conv:${conversationId}`);

        socket.emit("messages:joined", {
          ok: true,
          message: "Te uniste a la conversacion",
          conversationId,
        });
      } catch (error) {
        console.error("messages:join error:", error);

        socket.emit("messages:error", {
          code: "JOIN_CONVERSATION_FAILED",
          message: "Error al unirse a la conversacion",
        });
      }
    });

    socket.on("messages:send", async ({ conversation_id, content }) => {
      try {
        const conversationId = parseInt(conversation_id, 10);
        const senderId = getSocketUserId(socket);
        const text = String(content ?? "").trim();

        if (isNaN(conversationId) || isNaN(senderId)) {
          return socket.emit("messages:error", {
            code: "MESSAGE_PARAMS_INVALID",
            message: "Invalid conversation_id or authenticated user",
          });
        }

        if (!text) {
          return socket.emit("messages:error", {
            code: "MESSAGE_CONTENT_REQUIRED",
            message: "El contenido del mensaje es obligatorio",
          });
        }

        const allowed = await userBelongsToConversation(db, conversationId, senderId);
        if (!allowed) {
          return socket.emit("messages:error", {
            code: "MESSAGE_FORBIDDEN",
            message: "No perteneces a esta conversacion",
          });
        }

        const message = await insertMessage(db, conversationId, senderId, text);

        nsp.to(`conv:${conversationId}`).emit("messages:new", message);

        socket.emit("messages:sent", {
          ok: true,
          message: "Mensaje enviado correctamente",
          data: {
            messageId: message.message_id,
            conversationId,
          },
        });
      } catch (error) {
        console.error("messages:send error:", error);

        socket.emit("messages:error", {
          code: "MESSAGE_SEND_FAILED",
          message: "Error al enviar el mensaje",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("Usuario desconectado de /messages");
    });
  });
};
