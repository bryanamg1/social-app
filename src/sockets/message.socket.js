import db from "../config/db.js";
import { insertMessage } from "../service/messageService.js";
import { userBelongsToConversation } from "../service/conversationsService.js";

export const registerMessagesSocket = (io) => {
  const nsp = io.of("/messages");

  nsp.on("connection", (socket) => {
    console.log("🔌 Usuario conectado a /messages");

    socket.on("messages:join", async ({ conversation_id, user_id }) => {
      const conversationId = parseInt(conversation_id, 10);
      const userId = parseInt(user_id, 10);

      if (isNaN(conversationId) || isNaN(userId)) return;

      const allowed = await userBelongsToConversation(db, conversationId, userId);
      if (!allowed) return;

      socket.join(`conv:${conversationId}`);
    });

    socket.on("messages:send", async ({ conversation_id, sender_id, content }) => {
      const conversationId = parseInt(conversation_id, 10);
      const senderId = parseInt(sender_id, 10);
      const text = String(content ?? "").trim();

      if (isNaN(conversationId) || isNaN(senderId) || !text) return;

      const allowed = await userBelongsToConversation(db, conversationId, senderId);
      if (!allowed) return;

      const message = await insertMessage(db, conversationId, senderId, text);

      nsp.to(`conv:${conversationId}`).emit("messages:new", message);
    });

    socket.on("disconnect", () => {
      console.log("❌ Usuario desconectado de /messages");
    });
  });
};