import {getDB} from "../config/db.js";
import {
    deleteCommentThread,
    getCommentById,
    insertComment,
    readComments,
    updateCommentText,
} from "../service/commentService.js";
import { createNotification, NOTIFICATION_TYPES } from "../service/notificationService.js";
import { getPostById } from "../service/postsService.js";
import { AppError } from "../utils/utils.js";
import { getAuthenticatedUserId, isSameUser } from "../utils/authHelpers.js";

export const addComment = async (req, res, next) =>{
    try {
        const db = await getDB();
        const commentData = req.body;
        const authUserId = getAuthenticatedUserId(req);
        const postId = parseInt(req.params.postId, 10);

        if (!authUserId) {
        return next(
            new AppError({
                code: "UNAUTHORIZED",
                message: "Usuario no autenticado",
                status: 401
            })
        )
    }

    if (isNaN(postId)) {
     return next(
        new AppError({
            code: "POST_ID_INVALID",
            message: "Invalid or missing post ID",
            status: 400
        })
     )
    }

    if (!commentData || Object.keys(commentData).length === 0) {
      return next(
        new AppError({
            code: "COMMENT_DATA_EMPTY",
            message: "No comment data provided",
            status: 400
        })
      )
    }

    let {parent_comment_id, comment_text} = commentData

    if (!comment_text || comment_text.trim() === "") {
        return next(
            new AppError({
                code: "COMMENT_CONTENT_REQUIRED",
                message: "Comment text is required",
                status: 400
            })
        )
    } 
 
    if(!parent_comment_id || parent_comment_id === ""){
        parent_comment_id = null
    }else{
        parent_comment_id = parseInt(parent_comment_id, 10)

        if(isNaN(parent_comment_id)){
            return next(
                new AppError({
                    code: "COMMENT_ID_INVALID",
                    message: "Invalid parent_comment_id",
                    status:400
                })
            )
        }
    }

    const result = await insertComment(db,comment_text, parent_comment_id, postId, authUserId)
    const post = await getPostById(db, postId);

    if (post?.user_id) {
        await createNotification(
            post.user_id,
            NOTIFICATION_TYPES.COMMENT_POST,
            postId,
            authUserId
        );
    }

    res.status(201).json({
        message: "Comment added successfully",
      commentId: result.insertId,
    })


    }
    catch (error) {
        return next(
            new AppError({
                code: "ADD_COMMENT_FAILED",
                message: "Error inserting comment",
                status: 500,
                details: error?.code || error?.message || null,
            })
        )
    }
}

export const commentsByPost = async (req, res, next) => {
    try {
        const db = await getDB();

        const postId = parseInt(req.params.postId, 10);

        if (Number.isNaN(postId)) {
        return next(
            new AppError({
            code: "POST_ID_INVALID",
            message: "Invalid or missing post ID",
            status: 400,
            })
        );
        }

        const result = await readComments(db, postId);

        return res.status(200).json({
        ok: true,
        message: "Comments retrieved successfully",
        comments: result,
        });
    } catch (error) {
        return next(
        new AppError({
            code: "GET_COMMENTS_FAILED",
            message: "Error reading comments",
            status: 500,
            details: error?.code || error?.message || null,
        })
        );
    }
};

export const updateComment = async (req, res, next) => {
    try {
        const db = await getDB();
        const authUserId = getAuthenticatedUserId(req);
        const commentId = Number.parseInt(req.params.commentId, 10);
        const commentText = `${req.body?.comment_text ?? ""}`.trim();

        if (!authUserId) {
            return next(
                new AppError({
                    code: "UNAUTHORIZED",
                    message: "Usuario no autenticado",
                    status: 401,
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

        if (!commentText) {
            return next(
                new AppError({
                    code: "COMMENT_CONTENT_REQUIRED",
                    message: "Comment text is required",
                    status: 400,
                })
            );
        }

        const existingComment = await getCommentById(db, commentId);

        if (!existingComment) {
            return next(
                new AppError({
                    code: "COMMENT_NOT_FOUND",
                    message: "Comentario no encontrado",
                    status: 404,
                    details: { commentId },
                })
            );
        }

        if (!isSameUser(existingComment.user_id, authUserId)) {
            return next(
                new AppError({
                    code: "FORBIDDEN",
                    message: "No tienes permiso para editar este comentario",
                    status: 403,
                    details: {
                        authenticatedUserId: authUserId,
                        ownerUserId: existingComment.user_id,
                        commentId,
                    },
                })
            );
        }

        const updatedComment = await updateCommentText(db, {
            commentId,
            userId: authUserId,
            commentText,
        });

        return res.status(200).json({
            ok: true,
            message: "Comentario actualizado correctamente",
            data: updatedComment,
        });
    } catch (error) {
        return next(
            new AppError({
                code: "COMMENT_UPDATE_FAILED",
                message: "No se pudo actualizar el comentario",
                status: 500,
                details: error?.code || error?.message || null,
            })
        );
    }
};

export const deleteComment = async (req, res, next) => {
    try {
        const db = await getDB();
        const authUserId = getAuthenticatedUserId(req);
        const commentId = Number.parseInt(req.params.commentId, 10);

        if (!authUserId) {
            return next(
                new AppError({
                    code: "UNAUTHORIZED",
                    message: "Usuario no autenticado",
                    status: 401,
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

        const existingComment = await getCommentById(db, commentId);

        if (!existingComment) {
            return next(
                new AppError({
                    code: "COMMENT_NOT_FOUND",
                    message: "Comentario no encontrado",
                    status: 404,
                    details: { commentId },
                })
            );
        }

        if (!isSameUser(existingComment.user_id, authUserId)) {
            return next(
                new AppError({
                    code: "FORBIDDEN",
                    message: "No tienes permiso para eliminar este comentario",
                    status: 403,
                    details: {
                        authenticatedUserId: authUserId,
                        ownerUserId: existingComment.user_id,
                        commentId,
                    },
                })
            );
        }

        const result = await deleteCommentThread(db, commentId);

        if (!result?.affectedRows) {
            return next(
                new AppError({
                    code: "COMMENT_NOT_FOUND",
                    message: "Comentario no encontrado",
                    status: 404,
                    details: { commentId },
                })
            );
        }

        return res.status(200).json({
            ok: true,
            message: "Comentario eliminado correctamente",
            data: {
                commentId,
                affectedRows: result.affectedRows,
            },
        });
    } catch (error) {
        return next(
            new AppError({
                code: "COMMENT_DELETE_FAILED",
                message: "No se pudo eliminar el comentario",
                status: 500,
                details: error?.code || error?.message || null,
            })
        );
    }
};
