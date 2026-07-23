import {getDB} from "../config/db.js";
import { createNotification, NOTIFICATION_TYPES } from "../service/notificationService.js";
import { getPostById } from "../service/postsService.js";
import {AppError} from "../utils/utils.js"
import { getAuthenticatedUserId } from "../utils/authHelpers.js";

const createPostReactionNotification = async ({ postOwnerId, postId, userId }) => {
  if (!postOwnerId) {
    return;
  }

  try {
    await createNotification(
      postOwnerId,
      NOTIFICATION_TYPES.REACTION_POST,
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

const validateAuthenticatedActor = (req) => {
  const authUserId = getAuthenticatedUserId(req);

  if (!authUserId) {
    return {
      error: new AppError({
        code: "UNAUTHORIZED",
        message: "Usuario no autenticado",
        status: 401,
        }),
    };
  }

  return { authUserId };
};

export const toggleReactionPost = async (req, res, next) => {
  try {
    const db = await getDB();
    const { status } = req.body; // LIKE | DISLIKE | LOVE | HAHA | WOW | SAD
    const { authUserId, error } = validateAuthenticatedActor(req);
    const postId = Number(req.params.postId);

    if (error) {
      return next(error);
    }

    // ✅ validations
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
      [authUserId, postId]
    );

    // Ya existe una reacción
    if (existing.length > 0) {
      const currentReaction = existing[0].reaction_type;

      // Misma reacción → eliminar
      if (currentReaction === status) {
        await db.query(
          "DELETE FROM post_reactions WHERE user_id = ? AND post_id = ?",
          [authUserId, postId]
        );

        return res.status(200).json({
          ok: true,
          message: `Reacción eliminada (${status})`,
          data: {
            status: false,
            reaction: null,
            userId: authUserId,
            postId,
          },
        });
      }

      // Reacción distinta → actualizar
      await db.query(
        "UPDATE post_reactions SET reaction_type = ? WHERE user_id = ? AND post_id = ?",
        [status, authUserId, postId]
      );

      return res.status(200).json({
        ok: true,
        message: `Reacción actualizada a ${status}`,
        data: {
          status: true,
          reaction: status,
          userId: authUserId,
          postId,
        },
      });
    }

    // No existe → crear nueva
    await db.query(
      "INSERT INTO post_reactions (user_id, post_id, reaction_type) VALUES (?, ?, ?)",
      [authUserId, postId, status]
    );

    const post = await getPostById(db, postId);

    if (post?.user_id) {
      await createPostReactionNotification({
        postOwnerId: post.user_id,
        postId,
        userId: authUserId,
      });
    }

    return res.status(201).json({
      ok: true,
      message: `Reacción registrada: ${status}`,
      data: {
        status: true,
        reaction: status,
        userId: authUserId,
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
    const { authUserId, error } = validateAuthenticatedActor(req);
    const commentId = parseInt(req.params.commentId, 10);

    if (error) {
      return next(error);
    }

    // ✅ validations
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
      [authUserId, commentId]
    );

    // Ya existe una reacción
    if (existing.length > 0) {
      const currentReaction = existing[0].reaction_type;

      // Misma reacción → eliminar
      if (currentReaction === status) {
        await db.query(
          "DELETE FROM comment_reactions WHERE user_id = ? AND comment_id = ?",
          [authUserId, commentId]
        );

        return res.status(200).json({
          ok: true,
          message: `Reacción eliminada (${status})`,
          data: {
            status: false,
            reaction: null,
            userId: authUserId,
            commentId,
          },
        });
      }

      // Reacción distinta → actualizar
      await db.query(
        "UPDATE comment_reactions SET reaction_type = ? WHERE user_id = ? AND comment_id = ?",
        [status, authUserId, commentId]
      );

      return res.status(200).json({
        ok: true,
        message: `Reacción actualizada a ${status}`,
        data: {
          status: true,
          reaction: status,
          userId: authUserId,
          commentId,
        },
      });
    }

    // No existe → crear nueva
    await db.query(
      "INSERT INTO comment_reactions (user_id, comment_id, reaction_type) VALUES (?, ?, ?)",
      [authUserId, commentId, status]
    );

    return res.status(201).json({
      ok: true,
      message: `Reacción registrada: ${status}`,
      data: {
        status: true,
        reaction: status,
        userId: authUserId,
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
    const { authUserId, error } = validateAuthenticatedActor(req);
    const postId = parseInt(req.params.pid, 10);

    if (error) {
      return next(error);
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
      [authUserId, postId]
    );

    // 🟡 No existe reacción
    if (rows.length === 0) {
      return res.status(204).json({
        ok: true,
        message: "El usuario no ha reaccionado a este post",
        data: {
          reaction: null,
          userId: authUserId,
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
        userId: authUserId,
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
    const { authUserId, error } = validateAuthenticatedActor(req);
    const commentId = parseInt(req.params.cid, 10);

    if (error) {
      return next(error);
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
      [authUserId, commentId]
    );

    // 🟡 No existe reacción
    if (rows.length === 0) {
      return res.status(204).json({
        ok: true,
        message: "El usuario no ha reaccionado a este comentario",
        data: {
          reaction: null,
          userId: authUserId,
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
        userId: authUserId,
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
