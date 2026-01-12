import db from "../config/db.js";
import {findConversationBetweenTwoUsers,createConversation,addUsersToConversation,userBelongsToConversation,getMessagesByConversation,getUserConversations} from "../service/conversationsService.js";
import { insertMessage } from "../service/messageService.js";


export const createOrGetConversations = async (req, res) => {
  try {
    const { user_id, other_user_id } = req.body;

    const userId = parseInt(user_id, 10);
    const otherUserId = parseInt(other_user_id, 10);

    if (isNaN(userId) || isNaN(otherUserId)) {
      return res.status(400).json({ error: "Invalid or missing user IDs" });
    }

    if (userId === otherUserId) {
      return res.status(400).json({ error: "User IDs must be different" });
    }

    let conversationId = await findConversationBetweenTwoUsers(db, userId, otherUserId);

    if (!conversationId) {
      conversationId = await createConversation(db);
      await addUsersToConversation(db, conversationId, [userId, otherUserId]);
    }

    return res.status(200).json({
      message: "✅ Conversation retrieved successfully",
      conversationId
    });

  } catch (error) {
    console.error("createOrGetConversations error:", error);
    return res.status(500).json({ error: "Error del servidor", detail: error.message });
  }
};

export const getMyConversations = async (req, res) => {
  try {
    // ✅ unificamos: user_id
    const userId = parseInt(req.query.user_id, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid or missing user ID" });
    }

    const conversations = await getUserConversations(db, userId);

    return res.status(200).json({
      message: "✅ Conversations retrieved successfully",
      conversations
    });

  } catch (error) {
    console.error("getMyConversations error:", error);
    return res.status(500).json({ error: "Error del servidor", detail: error.message });
  }
};

export const getConversationsMessages = async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id, 10);
    const userId = parseInt(req.query.user_id, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid or missing user ID" });
    }

    if (isNaN(conversationId)) {
      return res.status(400).json({ error: "Invalid or missing conversation ID" });
    }

    const limit = Math.max(parseInt(req.query.limit, 10) || 50, 1);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0); // ✅ offset puede ser 0

    const allowed = await userBelongsToConversation(db, conversationId, userId);

    if (!allowed) {
      return res.status(403).json({ error: "No perteneces a esta conversación" }); // ✅ 403
    }

    const messages = await getMessagesByConversation(db, conversationId, limit, offset);

    return res.status(200).json({ messages });

  } catch (error) {
    console.error("getConversationsMessages error:", error);
    return res.status(500).json({ error: "Error del servidor", detail: error.message });
  }
};

export const sendMessageRest = async (req, res) => {
  try {
    const { senderId, conversationId, content } = req.body;

    const sender_id = parseInt(senderId, 10);
    const conversation_id = parseInt(conversationId, 10);
    const text = String(content ?? "").trim();

    if (isNaN(sender_id)) {
      return res.status(400).json({ error: "Invalid or missing sender ID" });
    }

    if (isNaN(conversation_id)) {
      return res.status(400).json({ error: "Invalid or missing conversation ID" });
    }

    if (!text) {
      return res.status(400).json({ error: "content is required" });
    }

    const allowed = await userBelongsToConversation(db, conversation_id, sender_id);

    if (!allowed) {
      return res.status(403).json({ error: "No perteneces a esta conversación" });
    }

    const message = await insertMessage(db, conversation_id, sender_id, text); // ✅ sender_id (parseado)

    return res.status(201).json({ message });

  } catch (error) {
    console.error("sendMessageRest error:", error);
    return res.status(500).json({ error: "Error del servidor", detail: error.message });
  }
};