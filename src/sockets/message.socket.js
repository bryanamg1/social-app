import db from "../config/db.js";
import { insertMessage } from "../service/messageService.js";
import { userBelongsToConversation } from "../service/conversationsService.js";

export const registerMessagesSocket = (io) => {
  const nsp = io.of("/messages");

  nsp.on("connection", (socket) => {
    console.log("🔌 Usuario conectado a /messages");

    socket.on("messages:join", async ({ conversation_id, user_id }) => {
      try {
        const conversationId = parseInt(conversation_id, 10);
        const userId = parseInt(user_id, 10);

        if (Number.isNaN(conversationId) || Number.isNaN(userId)) {
          return socket.emit("messages:error", {
            code: "JOIN_PARAMS_INVALID",
            message: "Invalid conversation_id or user_id",
          });
        }

        const allowed = await userBelongsToConversation(db, conversationId, userId);
        if (!allowed) {
          return socket.emit("messages:error", {
            code: "JOIN_FORBIDDEN",
            message: "No perteneces a esta conversación",
          });
        }

        socket.join(`conv:${conversationId}`);

        socket.emit("messages:joined", {
          ok: true,
          message: "✅ Te uniste a la conversación",
          conversationId,
        });
      } catch (error) {
        console.error("❌ messages:join error:", error);

        socket.emit("messages:error", {
          code: "JOIN_CONVERSATION_FAILED",
          message: "Error al unirse a la conversación",
        });
      }
    });

    socket.on("messages:send", async ({ conversation_id, sender_id, content }) => {
      try {
        const conversationId = parseInt(conversation_id, 10);
        const senderId = parseInt(sender_id, 10);
        const text = String(content ?? "").trim();

        if (isNaN(conversationId) || isNaN(senderId)) {
          return socket.emit("messages:error", {
            code: "MESSAGE_PARAMS_INVALID",
            message: "Invalid conversation_id or sender_id",
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
            message: "No perteneces a esta conversación",
          });
        }

        const message = await insertMessage(db, conversationId, senderId, text);

        // 🔔 Broadcast del mensaje a la conversación
        nsp.to(`conv:${conversationId}`).emit("messages:new", message);

        // ✅ Confirmación SOLO al emisor
        socket.emit("messages:sent", {
          ok: true,
          message: "✅ Mensaje enviado correctamente",
          data: {
            messageId: message.id || message.message_id,
            conversationId,
          },
        });
      } catch (error) {
        console.error("❌ messages:send error:", error);

        socket.emit("messages:error", {
          code: "MESSAGE_SEND_FAILED",
          message: "Error al enviar el mensaje",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Usuario desconectado de /messages");
    });
  });
};