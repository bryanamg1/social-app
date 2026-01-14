import db from "../config/db.js";
import {findConversationBetweenTwoUsers,createConversation,addUsersToConversation,userBelongsToConversation,getMessagesByConversation,getUserConversations} from "../service/conversationsService.js";
import { insertMessage } from "../service/messageService.js";
import { AppError } from "../utils/utils.js";


export const createOrGetConversations = async (req, res, next) => {
  try {
    const { user_id, other_user_id } = req.body;

    const userId = parseInt(user_id, 10);
    const otherUserId = parseInt(other_user_id, 10);

    if (isNaN(userId) || isNaN(otherUserId)) {
      return next(
        new AppError({
          code: "USER_IDS_INVALID",
          message: "Invalid or missing user IDs",
          status: 400,
          details: { user_id, other_user_id },
        })
      );
    }

    if (userId === otherUserId) {
      return next(
        new AppError({
          code: "USER_IDS_MUST_BE_DIFFERENT",
          message: "User IDs must be different",
          status: 400,
          details: { userId, otherUserId },
        })
      );
    }

    let conversationId = await findConversationBetweenTwoUsers(db, userId, otherUserId);

    if (!conversationId) {
      conversationId = await createConversation(db);
      await addUsersToConversation(db, conversationId, [userId, otherUserId]);
    }

    return res.status(200).json({
      ok: true,
      message: "✅ Conversation retrieved successfully",
      data: { conversationId },
    });
  } catch (error) {
    console.error("createOrGetConversations error:", error);

    return next(
      new AppError({
        code: "CONVERSATION_CREATE_OR_GET_FAILED",
        message: "Error del servidor",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};

export const getMyConversations = async (req, res, next) => {
  try {
    // ✅ unificamos: user_id
    const userId = parseInt(req.query.uid, 10);

    if (isNaN(userId)) {
      return next(
        new AppError({
          code: "USER_ID_INVALID",
          message: "Invalid or missing user ID",
          status: 400,
          details: { param: req.query.user_id },
        })
      );
    }

    const conversations = await getUserConversations(db, userId);

    return res.status(200).json({
      ok: true,
      message: "✅ Conversations retrieved successfully",
      data: {
        userId,
        conversations,
      },
    });
  } catch (error) {
    console.error("getMyConversations error:", error);

    return next(
      new AppError({
        code: "CONVERSATIONS_LIST_FAILED",
        message: "Error del servidor",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};


export const getConversationsMessages = async (req, res, next) => {
  try {
    const conversationId = parseInt(req.params.id, 10);
    const userId = parseInt(req.query.uid, 10);

    if (isNaN(userId)) {
      return next(
        new AppError({
          code: "USER_ID_INVALID",
          message: "Invalid or missing user ID",
          status: 400,
          details: { param: req.query.user_id },
        })
      );
    }

    if (isNaN(conversationId)) {
      return next(
        new AppError({
          code: "CONVERSATION_ID_INVALID",
          message: "Invalid or missing conversation ID",
          status: 400,
          details: { param: req.params.id },
        })
      );
    }

    const limit = Math.max(parseInt(req.query.limit, 10) || 50, 1);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const allowed = await userBelongsToConversation(db, conversationId, userId);

    if (!allowed) {
      return next(
        new AppError({
          code: "CONVERSATION_FORBIDDEN",
          message: "No perteneces a esta conversación",
          status: 403,
          details: { conversationId, userId },
        })
      );
    }

    const messages = await getMessagesByConversation(db, conversationId, limit, offset);

    return res.status(200).json({
      ok: true,
      message: "✅ Messages retrieved successfully",
      data: {
        conversationId,
        userId,
        limit,
        offset,
        count: messages?.length || 0,
        messages: messages || [],
      },
    });
  } catch (error) {
    console.error("getConversationsMessages error:", error);

    return next(
      new AppError({
        code: "CONVERSATION_MESSAGES_READ_FAILED",
        message: "Error del servidor",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};


export const sendMessageRest = async (req, res, next) => {
  try {
    const { senderId, conversationId, content } = req.body;

    const sender_id = parseInt(senderId, 10);
    const conversation_id = parseInt(conversationId, 10);
    const text = String(content ?? "").trim();

    if (isNaN(sender_id)) {
      return next(
        new AppError({
          code: "SENDER_ID_INVALID",
          message: "Invalid or missing sender ID",
          status: 400,
          details: { senderId },
        })
      );
    }

    if (isNaN(conversation_id)) {
      return next(
        new AppError({
          code: "CONVERSATION_ID_INVALID",
          message: "Invalid or missing conversation ID",
          status: 400,
          details: { conversationId },
        })
      );
    }

    if (!text) {
      return next(
        new AppError({
          code: "MESSAGE_CONTENT_REQUIRED",
          message: "content is required",
          status: 400,
        })
      );
    }

    const allowed = await userBelongsToConversation(db, conversation_id, sender_id);

    if (!allowed) {
      return next(
        new AppError({
          code: "CONVERSATION_FORBIDDEN",
          message: "No perteneces a esta conversación",
          status: 403,
          details: { conversation_id, sender_id },
        })
      );
    }

    const message = await insertMessage(db, conversation_id, sender_id, text);

    return res.status(201).json({
      ok: true,
      message: "✅ Message sent successfully",
      data: { message },
    });
  } catch (error) {
    console.error("sendMessageRest error:", error);

    return next(
      new AppError({
        code: "MESSAGE_SEND_FAILED",
        message: "Error del servidor",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};