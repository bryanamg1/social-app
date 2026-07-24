import { getDB } from "../config/db.js";
import { insertMessage } from "../service/messageService.js";
import {
  getConversationRecipientUserId,
  userBelongsToConversation,
} from "../service/conversationsService.js";
import {
  hasAnyUserBlock,
} from "../service/blocksService.js";
import {
  createNotification,
  NOTIFICATION_TYPES,
} from "../service/notificationService.js";
import { authenticateSocket, getSocketUserId } from "./socketAuth.js";

export const registerMessagesSocket = (io) => {
  const db = getDB();
  const nsp = io.of("/messages");

  nsp.use(authenticateSocket);

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

        const recipientUserId = await getConversationRecipientUserId(
          db,
          conversationId,
          userId
        );
        const hasBlock = recipientUserId
          ? await hasAnyUserBlock(db, {
              currentUserId: userId,
              targetUserId: recipientUserId,
            })
          : false;

        if (hasBlock) {
          return socket.emit("messages:error", {
            code: "BLOCK_RELATIONSHIP_FORBIDDEN",
            message: "La conversacion no esta disponible por una relacion de bloqueo activa",
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

        const recipientUserId = await getConversationRecipientUserId(
          db,
          conversationId,
          senderId
        );
        const hasBlock = recipientUserId
          ? await hasAnyUserBlock(db, {
              currentUserId: senderId,
              targetUserId: recipientUserId,
            })
          : false;

        if (hasBlock) {
          return socket.emit("messages:error", {
            code: "BLOCK_RELATIONSHIP_FORBIDDEN",
            message: "No puedes enviar mensajes por una relacion de bloqueo activa",
          });
        }

        const message = await insertMessage(db, conversationId, senderId, text);

        if (recipientUserId) {
          await createNotification(
            recipientUserId,
            NOTIFICATION_TYPES.MESSAGE,
            conversationId,
            senderId
          );
        }

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

    socket.on("messages:typing", async ({ conversation_id, is_typing }) => {
      try {
        const conversationId = parseInt(conversation_id, 10);
        const userId = getSocketUserId(socket);

        if (isNaN(conversationId) || isNaN(userId)) {
          return socket.emit("messages:error", {
            code: "TYPING_PARAMS_INVALID",
            message: "Invalid conversation_id or authenticated user",
          });
        }

        const allowed = await userBelongsToConversation(db, conversationId, userId);

        if (!allowed) {
          return socket.emit("messages:error", {
            code: "TYPING_FORBIDDEN",
            message: "No perteneces a esta conversacion",
          });
        }

        const recipientUserId = await getConversationRecipientUserId(
          db,
          conversationId,
          userId
        );
        const hasBlock = recipientUserId
          ? await hasAnyUserBlock(db, {
              currentUserId: userId,
              targetUserId: recipientUserId,
            })
          : false;

        if (hasBlock) {
          return socket.emit("messages:error", {
            code: "BLOCK_RELATIONSHIP_FORBIDDEN",
            message: "No puedes sincronizar escritura por una relacion de bloqueo activa",
          });
        }

        socket.to(`conv:${conversationId}`).emit("messages:typing", {
          conversation_id: conversationId,
          user_id: userId,
          is_typing: Boolean(is_typing),
        });
      } catch (error) {
        console.error("messages:typing error:", error);

        socket.emit("messages:error", {
          code: "MESSAGE_TYPING_FAILED",
          message: "Error al sincronizar el estado de escritura",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("Usuario desconectado de /messages");
    });
  });
};
