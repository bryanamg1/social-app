import { getDB } from "../config/db.js";
import {
  findConversationBetweenTwoUsers,
  createConversation,
  addUsersToConversation,
  getConversationRecipientUserId,
  markConversationMessagesRead,
  userBelongsToConversation,
  getMessagesByConversation,
  getUserConversations,
} from "../service/conversationsService.js";
import { hasAnyUserBlock } from "../service/blocksService.js";
import { canSendDirectMessage } from "../service/privacySettingsService.js";
import { insertMessage } from "../service/messageService.js";
import { AppError } from "../utils/utils.js";
import { getIO } from "../sockets/sockets.js";

const getAuthenticatedUserId = (req) => {
  return Number(req.user?.user_id ?? req.user?.id ?? req.user?.user?.id);
};

const ensureConversationAvailable = async (db, conversationId, userId) => {
  const recipientUserId = await getConversationRecipientUserId(
    db,
    conversationId,
    userId
  );

  if (!recipientUserId) {
    return;
  }

  const hasBlock = await hasAnyUserBlock(db, {
    currentUserId: userId,
    targetUserId: recipientUserId,
  });

  if (!hasBlock) {
    return;
  }

  throw new AppError({
    code: "BLOCK_RELATIONSHIP_FORBIDDEN",
    message: "La conversacion no esta disponible por una relacion de bloqueo activa",
    status: 403,
    details: {
      conversationId,
      userId,
      recipientUserId,
    },
  });
};

export const createOrGetConversations = async (req, res, next) => {
  try {
    const db = await getDB();
    const { other_user_id } = req.body;

    const userId = getAuthenticatedUserId(req);
    const otherUserId = parseInt(other_user_id, 10);

    if (isNaN(userId)) {
      return next(
        new AppError({
          code: "UNAUTHORIZED",
          message: "Usuario no autenticado",
          status: 401,
        })
      );
    }

    if (isNaN(otherUserId)) {
      return next(
        new AppError({
          code: "USER_ID_INVALID",
          message: "Invalid or missing user ID",
          status: 400,
          details: { other_user_id },
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

    const hasBlock = await hasAnyUserBlock(db, {
      currentUserId: userId,
      targetUserId: otherUserId,
    });

    if (hasBlock) {
      return next(
        new AppError({
          code: "BLOCK_RELATIONSHIP_FORBIDDEN",
          message: "No puedes iniciar una conversacion por una relacion de bloqueo activa",
          status: 403,
          details: { userId, otherUserId },
        })
      );
    }

    const canSendMessage = await canSendDirectMessage(db, {
      senderUserId: userId,
      recipientUserId: otherUserId,
    });

    if (!canSendMessage) {
      return next(
        new AppError({
          code: "DIRECT_MESSAGE_FORBIDDEN",
          message: "Este usuario solo acepta mensajes directos de seguidores",
          status: 403,
          details: { userId, otherUserId },
        })
      );
    }

    let conversationId = await findConversationBetweenTwoUsers(
      db,
      userId,
      otherUserId
    );

    if (!conversationId) {
      conversationId = await createConversation(db);
      await addUsersToConversation(db, conversationId, [userId, otherUserId]);
    }

    return res.status(200).json({
      ok: true,
      message: "Conversation retrieved successfully",
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
    const db = await getDB();
    const userId = getAuthenticatedUserId(req);

    if (isNaN(userId)) {
      return next(
        new AppError({
          code: "UNAUTHORIZED",
          message: "Usuario no autenticado",
          status: 401,
        })
      );
    }

    const conversations = await getUserConversations(db, userId);

    return res.status(200).json({
      ok: true,
      message: "Conversations retrieved successfully",
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
    const db = await getDB();
    const conversationId = parseInt(req.params.id, 10);
    const userId = getAuthenticatedUserId(req);

    if (isNaN(userId)) {
      return next(
        new AppError({
          code: "UNAUTHORIZED",
          message: "Usuario no autenticado",
          status: 401,
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
          message: "No perteneces a esta conversacion",
          status: 403,
          details: { conversationId, userId },
        })
      );
    }

    await ensureConversationAvailable(db, conversationId, userId);

    const messages = await getMessagesByConversation(
      db,
      conversationId,
      limit,
      offset
    );

    return res.status(200).json({
      ok: true,
      message: "Messages retrieved successfully",
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
    const db = await getDB();
    const { conversationId, conversation_id, content } = req.body;

    const senderId = getAuthenticatedUserId(req);
    const nextConversationId = conversationId ?? conversation_id;
    const parsedConversationId = parseInt(nextConversationId, 10);
    const text = String(content ?? "").trim();

    if (isNaN(senderId)) {
      return next(
        new AppError({
          code: "UNAUTHORIZED",
          message: "Usuario no autenticado",
          status: 401,
        })
      );
    }

    if (isNaN(parsedConversationId)) {
      return next(
        new AppError({
          code: "CONVERSATION_ID_INVALID",
          message: "Invalid or missing conversation ID",
          status: 400,
          details: { conversationId: nextConversationId },
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

    const allowed = await userBelongsToConversation(
      db,
      parsedConversationId,
      senderId
    );

    if (!allowed) {
      return next(
        new AppError({
          code: "CONVERSATION_FORBIDDEN",
          message: "No perteneces a esta conversacion",
          status: 403,
          details: { conversation_id: parsedConversationId, sender_id: senderId },
        })
      );
    }

    await ensureConversationAvailable(db, parsedConversationId, senderId);

    const message = await insertMessage(
      db,
      parsedConversationId,
      senderId,
      text
    );

    return res.status(201).json({
      ok: true,
      message: "Message sent successfully",
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

export const markConversationRead = async (req, res, next) => {
  try {
    const db = await getDB();
    const conversationId = parseInt(req.params.id, 10);
    const userId = getAuthenticatedUserId(req);

    if (isNaN(userId)) {
      return next(
        new AppError({
          code: "UNAUTHORIZED",
          message: "Usuario no autenticado",
          status: 401,
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

    const allowed = await userBelongsToConversation(db, conversationId, userId);

    if (!allowed) {
      return next(
        new AppError({
          code: "CONVERSATION_FORBIDDEN",
          message: "No perteneces a esta conversacion",
          status: 403,
          details: { conversationId, userId },
        })
      );
    }

    await ensureConversationAvailable(db, conversationId, userId);

    const result = await markConversationMessagesRead(db, conversationId, userId);

    if (result.read_at) {
      getIO().of("/messages").to(`conv:${conversationId}`).emit("messages:read", {
        conversation_id: conversationId,
        user_id: userId,
        read_at: result.read_at,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Conversation read state updated successfully",
      data: {
        conversationId,
        userId,
        ...result,
      },
    });
  } catch (error) {
    console.error("markConversationRead error:", error);

    return next(
      new AppError({
        code: "CONVERSATION_READ_STATE_FAILED",
        message: "Error del servidor",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};
