import {getDB} from "../config/db.js";
import { insertComment, readComments } from "../service/commentService.js";
import { createNotification, NOTIFICATION_TYPES } from "../service/notificationService.js";
import { getPostById } from "../service/postsService.js";
import { AppError } from "../utils/utils.js";

export const addComment = async (req, res, next) =>{
    try {
        const db = await getDB();
        const commentData = req.body;
        const userId = parseInt(req.params.id, 10);
        const postId = parseInt(req.params.postId, 10);

        if (isNaN(userId)) {
        return next(
            new AppError({
                code: "USER_ID_INVALID",
                message: "Invalid or missing user ID",
                status: 400
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

    const result = await insertComment(db,comment_text, parent_comment_id, postId, userId)
    const post = await getPostById(db, postId);

    if (post?.user_id) {
        await createNotification(
            post.user_id,
            NOTIFICATION_TYPES.COMMENT,
            postId,
            userId
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
