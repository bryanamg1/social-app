import { json } from "express";
import db from "../config/db.js";
import { insertPost, getPosts } from "../service/postsService.js";

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

export const allpost = async (req, res) =>{
try {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit) || 10, 1);
  const offset = (page -1) * limit;

  const result = await getPosts(db, limit, offset)

  res.status(200).json({
    message: "✅ Posts retrieved successfully",
    posts: result
  });
} catch (error) {
     res.status(500).json({ error: "Error retrieving posts" }); 
}
};

export const postById = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const offset = (page - 1) * limit;
    const userId = parseInt(req.params.id, 10);

    // 🔹 Validación del ID
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid or missing user ID" });
    }

    // 🔹 Consulta al servicio
    const result = await getPosts(db, limit, offset, userId);

    // 🔹 Si no hay resultados
    if (!result || result.length === 0) {
  return res.status(404).json({
    message: "⚠️ No se encontraron posts para este usuario.",
    userId
  });
}

    // 🔹 Respuesta exitosa
    res.status(200).json({
      message: "✅ Posts retrieved successfully",
      ...result
    });

  } catch (error) {
    console.error("❌ Error retrieving posts:", error);
    res.status(500).json({ error: "Error retrieving posts" });
  }
};