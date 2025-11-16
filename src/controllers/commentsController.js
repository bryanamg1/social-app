import db from "../config/db.js";
import { insertComment } from "../service/commentService.js";

export const addComment = async (req, res) =>{
    try {
        const commentData = req.body;
        const userId = parseInt(req.params.id, 10);
        const postId = parseInt(req.params.postId, 10);

        if (isNaN(userId)) {
     return res.status(400).json({ error: "Invalid or missing user ID" });
    }

    if (isNaN(postId)) {
     return res.status(400).json({ error: "Invalid or missing user ID" });
    }

    if (!commentData || Object.keys(commentData).length === 0) {
      return res.status(400).json({ error: "No comment data provided" });
    }

    let {parent_comment_id, comment_text} = commentData

    if (!comment_text || comment_text.trim() === "") {
    return res.status(400).json({ error: "Comment text is required" });
    } 

    if(!parent_comment_id || parent_comment_id === ""){
        parent_comment_id = null
    }else{
        parent_comment_id = parseInt(parent_comment_id, 10)

        if(isNaN(parent_comment_id)){
            return res.status(400).json({error:"Invalid parent_comment_id"})
        }
    }

    const result = await insertComment(db,comment_text, parent_comment_id, postId, userId)

    res.status(201).json({
        message: "✅ Comment added successfully",
      commentId: result.insertId,
    })


    }
    catch (error) {
        res.status(500).json({ error: "Error inserting comment" });
    }
}