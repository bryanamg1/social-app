import {getDB} from "../config/db.js";
import { createNotification, NOTIFICATION_TYPES } from "../service/notificationService.js";
import { getPostById } from "../service/postsService.js";
import {AppError} from "../utils/utils.js"

const createPostReactionNotification = async ({ postOwnerId, postId, userId }) => {
  if (!postOwnerId) {
    return;
  }

  try {
    await createNotification(
      postOwnerId,
      NOTIFICATION_TYPES.REACTION,
      postId,
      userId
    );
  } catch (error) {
    console.error("Reaction notification skipped:", {
      postOwnerId,
      postId,
      userId,
      code: error?.code || null,
      message: error?.message || null,
    });
  }
};

export const toggleReactionPost = async (req, res, next) => {
  try {
    const db = await getDB();
    const { status } = req.body; // LIKE | DISLIKE | LOVE | HAHA | WOW | SAD
    const userId = Number(req.params.userId);
    const postId = Number(req.params.postId);

    // ✅ validations
    if (!Number.isInteger(userId) || userId <= 0) {
      return next(
        new AppError({
          code: "USER_ID_INVALID",
          message: "Invalid or missing user ID",
          status: 400,
          details: { param: req.params.userId },
        })
      );
    }

    if (!Number.isInteger(postId) || postId <= 0) {
      return next(
        new AppError({
          code: "POST_ID_INVALID",
          message: "Invalid or missing post ID",
          status: 400,
          details: { param: req.params.postId },
        })
      );
    }

    if (!status) {
      return next(
        new AppError({
          code: "REACTION_STATUS_REQUIRED",
          message: "status requerido",
          status: 400,
        })
      );
    }

    const validReactions = ["LIKE", "DISLIKE", "LOVE", "HAHA", "WOW", "SAD"];
    if (!validReactions.includes(status)) {
      return next(
        new AppError({
          code: "REACTION_STATUS_INVALID",
          message: "status debe ser LIKE, DISLIKE, LOVE, HAHA, WOW o SAD",
          status: 400,
          details: { allowed: validReactions, received: status },
        })
      );
    }

    // Buscar reacción existente
    const [existing] = await db.query(
      "SELECT reaction_type FROM post_reactions WHERE user_id = ? AND post_id = ?",
      [userId, postId]
    );

    // Ya existe una reacción
    if (existing.length > 0) {
      const currentReaction = existing[0].reaction_type;

      // Misma reacción → eliminar
      if (currentReaction === status) {
        await db.query(
          "DELETE FROM post_reactions WHERE user_id = ? AND post_id = ?",
          [userId, postId]
        );

        return res.status(200).json({
          ok: true,
          message: `Reacción eliminada (${status})`,
          data: {
            status: false,
            reaction: null,
            userId,
            postId,
          },
        });
      }

      // Reacción distinta → actualizar
      await db.query(
        "UPDATE post_reactions SET reaction_type = ? WHERE user_id = ? AND post_id = ?",
        [status, userId, postId]
      );

      return res.status(200).json({
        ok: true,
        message: `Reacción actualizada a ${status}`,
        data: {
          status: true,
          reaction: status,
          userId,
          postId,
        },
      });
    }

    // No existe → crear nueva
    await db.query(
      "INSERT INTO post_reactions (user_id, post_id, reaction_type) VALUES (?, ?, ?)",
      [userId, postId, status]
    );

    const post = await getPostById(db, postId);

    if (post?.user_id) {
      await createPostReactionNotification({
        postOwnerId: post.user_id,
        postId,
        userId,
      });
    }

    return res.status(201).json({
      ok: true,
      message: `Reacción registrada: ${status}`,
      data: {
        status: true,
        reaction: status,
        userId,
        postId,
      },
    });
  } catch (error) {
    console.error("Error al manejar la reacción:", error);

    return next(
      new AppError({
        code: "POST_REACTION_TOGGLE_FAILED",
        message: "Error al manejar la reacción",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};


export const getReactionsByPost = async (req, res, next) => {
  try {
    const db = await getDB();
    const postId = parseInt(req.params.postId, 10);

    if (Number.isNaN(postId)) {
      return next(
        new AppError({
          code: "POST_ID_INVALID",
          message: "Invalid or missing post ID",
          status: 400,
          details: { param: req.params.postId },
        })
      );
    }

    const [results] = await db.query(
      "SELECT reaction_type, COUNT(*) AS count FROM post_reactions WHERE post_id = ? GROUP BY reaction_type",
      [postId]
    );

    if (!results || results.length === 0) {
      return res.status(204).json({
        ok: true,
        message: "no hay reacciones para este post",
        data:{
          postId
        }
      })
    }

    return res.status(200).json({
      ok: true,
      message: "✅ Reactions retrieved successfully",
      data: {
        postId,
        reactions: results,
      },
    });
  } catch (error) {
    console.error("Error al obtener reacciones:", error);

    return next(
      new AppError({
        code: "POST_REACTIONS_READ_FAILED",
        message: "Error al obtener reacciones",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};;

export const toggleReactionComment = async (req, res, next) => {
  try {
    const db = await getDB();
    const { status } = req.body; // LIKE | DISLIKE | LOVE | HAHA | WOW | SAD
    const userId = parseInt(req.params.userId, 10);
    const commentId = parseInt(req.params.commentId, 10);

    // ✅ validations
    if (!Number.isInteger(userId) || userId <= 0) {
      return next(
        new AppError({
          code: "USER_ID_INVALID",
          message: "Invalid or missing user ID",
          status: 400,
          details: { param: req.params.userId },
        })
      );
    }

    if (!Number.isInteger(commentId) || commentId <= 0) {
      return next(
        new AppError({
          code: "COMMENT_ID_INVALID",
          message: "Invalid or missing comment ID",
          status: 400,
          details: { param: req.params.commentId },
        })
      );
    }

    if (!status) {
      return next(
        new AppError({
          code: "REACTION_STATUS_REQUIRED",
          message: "status requerido",
          status: 400,
        })
      );
    }

    const validReactions = ["LIKE", "DISLIKE", "LOVE", "HAHA", "WOW", "SAD"];
    if (!validReactions.includes(status)) {
      return next(
        new AppError({
          code: "REACTION_STATUS_INVALID",
          message: "status debe ser LIKE, DISLIKE, LOVE, HAHA, WOW o SAD",
          status: 400,
          details: { allowed: validReactions, received: status },
        })
      );
    }

    // Buscar reacción existente
    const [existing] = await db.query(
      "SELECT reaction_type FROM comment_reactions WHERE user_id = ? AND comment_id = ?",
      [userId, commentId]
    );

    // Ya existe una reacción
    if (existing.length > 0) {
      const currentReaction = existing[0].reaction_type;

      // Misma reacción → eliminar
      if (currentReaction === status) {
        await db.query(
          "DELETE FROM comment_reactions WHERE user_id = ? AND comment_id = ?",
          [userId, commentId]
        );

        return res.status(200).json({
          ok: true,
          message: `Reacción eliminada (${status})`,
          data: {
            status: false,
            reaction: null,
            userId,
            commentId,
          },
        });
      }

      // Reacción distinta → actualizar
      await db.query(
        "UPDATE comment_reactions SET reaction_type = ? WHERE user_id = ? AND comment_id = ?",
        [status, userId, commentId]
      );

      return res.status(200).json({
        ok: true,
        message: `Reacción actualizada a ${status}`,
        data: {
          status: true,
          reaction: status,
          userId,
          commentId,
        },
      });
    }

    // No existe → crear nueva
    await db.query(
      "INSERT INTO comment_reactions (user_id, comment_id, reaction_type) VALUES (?, ?, ?)",
      [userId, commentId, status]
    );

    return res.status(201).json({
      ok: true,
      message: `Reacción registrada: ${status}`,
      data: {
        status: true,
        reaction: status,
        userId,
        commentId,
      },
    });
  } catch (error) {
    console.error("Error al manejar la reacción:", error);

    return next(
      new AppError({
        code: "COMMENT_REACTION_TOGGLE_FAILED",
        message: "Error al manejar la reacción",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};


export const getReactionsByComment = async (req, res, next) => {
  try {
    const db = await getDB();
    const commentId = parseInt(req.params.commentId, 10);

    if (Number.isNaN(commentId)) {
      return next(
        new AppError({
          code: "COMMENT_ID_INVALID",
          message: "Invalid or missing comment ID",
          status: 400,
          details: { param: req.params.commentId },
        })
      );
    }

    const [results] = await db.query(
      "SELECT reaction_type, COUNT(*) AS count FROM comment_reactions WHERE comment_id = ? GROUP BY reaction_type",
      [commentId]
    );

    if (!results || results.length === 0) {
      return res.status(204).json({
        ok: true,
        message: "no hay reacciones para este comentario",
        data: {
          commentId
        }
      })
    }

    return res.status(200).json({
      ok: true,
      message: "✅ Reactions retrieved successfully",
      data: {
        commentId,
        reactions: results,
      },
    });
  } catch (error) {
    console.error("Error al obtener reacciones:", error);

    return next(
      new AppError({
        code: "COMMENT_REACTIONS_READ_FAILED",
        message: "Error al obtener reacciones",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};

export const getMyReactionByPost = async (req, res, next) => {
  try {
    const db = await getDB();
    const userId = parseInt(req.params.uid, 10);
    const postId = parseInt(req.params.pid, 10);

    if (isNaN(userId)) {
      return next(
        new AppError({
          code: "USER_ID_INVALID",
          message: "Invalid or missing user ID",
          status: 400,
          details: { param: req.params.uid },
        })
      );
    }

    if (isNaN(postId)) {
      return next(
        new AppError({
          code: "POST_ID_INVALID",
          message: "Invalid or missing post ID",
          status: 400,
          details: { param: req.params.pid },
        })
      );
    }

    const [rows] = await db.query(
      "SELECT reaction_type FROM post_reactions WHERE user_id = ? AND post_id = ?",
      [userId, postId]
    );

    // 🟡 No existe reacción
    if (rows.length === 0) {
      return res.status(204).json({
        ok: true,
        message: "El usuario no ha reaccionado a este post",
        data: {
          reaction: null,
          userId,
          postId,
        },
      });
    }

    // 🟢 Existe reacción
    const currentReaction = rows[0].reaction_type;

    return res.status(200).json({
      ok: true,
      message: "Reacción obtenida",
      data: {
        reaction: currentReaction,
        userId,
        postId,
      },
    });

  } catch (error) {
    console.error("Error al obtener reacciones:", error);

    return next(
      new AppError({
        code: "POST_REACTIONS_READ_FAILED",
        message: "Error al obtener reacciones",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};

export const getMyReactionByComment = async (req, res, next) => {
  try {
    const db = await getDB();
    const userId = parseInt(req.params.uid, 10);
    const commentId = parseInt(req.params.cid, 10);

    if (isNaN(userId)) {
      return next(
        new AppError({
          code: "USER_ID_INVALID",
          message: "Invalid or missing user ID",
          status: 400,
          details: { param: req.params.uid },
        })
      );
    }

    if (isNaN(commentId)) {
      return next(
        new AppError({
          code: "POST_ID_INVALID",
          message: "Invalid or missing post ID",
          status: 400,
          details: { param: req.params.cid },
        })
      );
    }

    const [rows] = await db.query(
      "SELECT reaction_type FROM comment_reactions WHERE user_id = ? AND comment_id = ?",
      [userId, commentId]
    );

    // 🟡 No existe reacción
    if (rows.length === 0) {
      return res.status(204).json({
        ok: true,
        message: "El usuario no ha reaccionado a este comentario",
        data: {
          reaction: null,
          userId,
          commentId,
        },
      });
    }

    // 🟢 Existe reacción
    const currentReaction = rows[0].reaction_type;

    return res.status(200).json({
      ok: true,
      message: "Reacción obtenida",
      data: {
        reaction: currentReaction,
        userId,
        commentId,
      },
    });

  } catch (error) {
    console.error("Error al obtener reacciones:", error);

    return next(
      new AppError({
        code: "comment_REACTIONS_READ_FAILED",
        message: "Error al obtener reacciones",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};
