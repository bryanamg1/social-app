import {getDB} from "../config/db.js";
import {
  createNotification,
  NOTIFICATION_TYPES,
} from "../service/notificationService.js";
import { AppError } from "../utils/utils.js";

export const getFollowStatus = async (req, res, next) => {
  try {
    const db = getDB();
    const currentUserId = Number(req.user?.user_id);
    const targetUserId = Number(req.params.id);

    if (!currentUserId) {
      return next(
        new AppError({
          code: "UNAUTHORIZED",
          message: "Usuario no autenticado",
          status: 401,
        })
      );
    }

    if (Number.isNaN(targetUserId)) {
      return next(
        new AppError({
          code: "USER_ID_INVALID",
          message: "ID de usuario invalido",
          status: 400,
          details: { param: req.params.id },
        })
      );
    }

    if (currentUserId === targetUserId) {
      return res.status(200).json({
        ok: true,
        data: {
          isFollowing: false,
        },
      });
    }

    const [following] = await db.query(
      "SELECT 1 FROM follows WHERE follower_id = ? AND followed_id = ? LIMIT 1",
      [currentUserId, targetUserId]
    );

    return res.status(200).json({
      ok: true,
      data: {
        isFollowing: following.length > 0,
      },
    });
  } catch (error) {
    return next(
      new AppError({
        code: "FOLLOW_STATUS_READ_FAILED",
        message: "No se pudo consultar el estado de seguimiento",
        status: 500,
        details: error?.message || null,
      })
    );
  }
};

export const followUser = async (req, res, next) =>{
    try{
        const db = getDB();
        const followerid = req.params.id;
        const followidUser = req.user.user_id;
        if (Number(followidUser) === Number(followerid)) {
            return res.status(400).json({msg:"No puedes seguirte"});
        }
        const [userExists] = await db.query("SELECT * FROM users WHERE user_id = ?",
            [followerid]);

        if (userExists.length === 0) {
            return next(
                new AppError({
                    code:"EMAIL_REGISTERED",
                    message:"este usuario no existe",
                    status:409
                })
            );
        }
        const [following] = await db.query("SELECT * FROM follows WHERE follower_id = ? AND followed_id = ?", 
            [followidUser, followerid]);

        if (following.length > 0) {
            return next(
                new AppError({
                    code:"FOLLOW_USER",
                    message:"ya sigues a este usuario",
                    status:409
                })
            );
        }

        await db.query("INSERT INTO follows (follower_id, followed_id, created_at) Values (?,?,NOW())",
            [followidUser, followerid]
        );
        await createNotification(
            followerid,
            NOTIFICATION_TYPES.FOLLOW_USER,
            followidUser,
            followidUser
        );
        res.status(201).json({msg:"Seguiendo al usuario"});
    }catch (error) {
    console.error("❌ Error al seguir usuario:", error);
        return next(
            new AppError({
                code: "FOLLOW_USER_ERROR",
                message: "Error al seguir al usuario",
                status: 500,
                details: error?.message || null,
            })
        );
    }
};

export const unfollowUser = async (req, res, next) => {
  try {
    const db = getDB();

    const currentUserId = req.user?.user_id;
    const unfollowedId = Number(req.params.id);

    // 🔐 Validar autenticación
    if (!currentUserId) {
      return next(
        new AppError({
          code: "UNAUTHORIZED",
          message: "Usuario no autenticado",
          status: 401,
        })
      );
    }

    // 🔢 Validar ID
    if (Number.isNaN(unfollowedId)) {
      return next(
        new AppError({
          code: "USER_ID_INVALID",
          message: "ID de usuario inválido",
          status: 400,
          details: { param: req.params.id },
        })
      );
    }

    // 🚫 Evitar dejar de seguirse a sí mismo
    if (currentUserId === unfollowedId) {
      return next(
        new AppError({
          code: "INVALID_OPERATION",
          message: "No puedes dejar de seguirte a ti mismo",
          status: 400,
        })
      );
    }

    // 🔍 Verificar que el usuario existe
    const [userExists] = await db.query(
      "SELECT user_id FROM users WHERE user_id = ?",
      [unfollowedId]
    );

    if (!userExists || userExists.length === 0) {
      return next(
        new AppError({
          code: "USER_NOT_FOUND",
          message: "Este usuario no existe",
          status: 404,
          details: { userId: unfollowedId },
        })
      );
    }

    // 🗑️ Eliminar relación
    const [result] = await db.query(
      "DELETE FROM follows WHERE follower_id = ? AND followed_id = ?",
      [currentUserId, unfollowedId]
    );

    if (result.affectedRows === 0) {
      return next(
        new AppError({
          code: "NOT_FOLLOWING",
          message: "No estás siguiendo a este usuario",
          status: 400,
        })
      );
    }

    return res.status(200).json({
      ok: true,
      message: "Has dejado de seguir al usuario",
      data: {
        follower_id: currentUserId,
        unfollowed_id: unfollowedId,
      },
    });

  } catch (error) {
    console.error("unfollowUser error:", error);

    return next(
      new AppError({
        code: "UNFOLLOW_USER_FAILED",
        message: "Error al dejar de seguir",
        status: 500,
        details: error?.message || null,
      })
    );
  }
};

export const feedfollowers = async (req, res, next) => {
    try {
        // Buscamos en ambas propiedades por si acaso
        const idRaw = req.user.user_id || req.user.id;
        const userId = parseInt(idRaw, 10);

        if (isNaN(userId)) {
            return next(new AppError({
                code: "USER_ID_INVALID",
                message: "Invalid or missing user ID",
                status: 400,
            }));
        }
        const db = getDB();
        const [feed] = await db.query(
            `SELECT p.post_id, p.content, p.image_url, p.created_at, u.user_id, u.user_name FROM posts p
            JOIN users u ON p.user_id = u.user_id
            JOIN follows f ON u.user_id = f.followed_id WHERE f.follower_id = ? ORDER BY p.created_at DESC`,
            [userId]
        );
        if (feed.length === 0) {
            return next(
                new AppError({
                    code: "NOT_FOUND_POST",
                    message: "este usuari no tiene post",
                    status: 400
                })
            )
        }
        res.status(200).json({msg:"feed de los usuarios que sigues",data:feed});
    } catch (error) {
        return next(
            new AppError({
                code: "FEED_USER_FAILED",
                message: "error al buscar el feed el usuario",
                status: 500,
                details: error?.code || error?.message || null,
            })
        )

    }
}
