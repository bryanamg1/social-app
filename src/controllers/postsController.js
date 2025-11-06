import db from "../config/db.js";
import { insertPost } from "../service/postsService.js";

export const addpost = async (req, res) => {
    try {
     const postData = req.body;
     const userId = parseInt(req.params.id, 10);
 // validations

        if (isNaN(userId)) {
     return res.status(400).json({ error: "Invalid or missing user ID" });
    }

    if (!postData || Object.keys(postData).length === 0) {
      return res.status(400).json({ error: "No post data provided" });
    }

    if (!postData.content || postData.content.trim() === "") {
    return res.status(400).json({ error: "Post content is required" });
    }

    if (!postData.image_url || postData.image_url.trim() === "") {
     postData.image_url = null
    }
// insert
    const result = await insertPost(db, postData, userId);

    res.status(201).json({
      message: "✅ Post added successfully",
      postId: result.insertId,
    });


    } catch (error) {
        res.status(500).json({ error: "Error adding post" });
    }
};