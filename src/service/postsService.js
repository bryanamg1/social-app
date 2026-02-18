import {getDB} from "../config/db.js";
export const insertPost = async(db, postData, userId, image_url) =>{
    try {
      const db = getDB();
        const inserPostQuery = 
        `INSERT INTO posts (user_id, content, image_url)
        VALUES (?, ?, ?)
        `;

        const {content} = postData;

        const result = await db.query(inserPostQuery, [userId, content, image_url]);
        console.log("✅ Post inserted successfully", result)
        return result;

    } catch (error) {
        console.error("❌ Error inserting post", error);
        throw error;
    }
}

export const getPosts = async (db, limit, offset, userId = null)=>{
    try {
      const db = getDB();
        let query = `
      SELECT p.*, u.user_name 
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
    `;
    const params = [];

    if (userId) {
      query += ` WHERE u.user_id = ?`;
      params.push(userId);
    }


    query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await db.query(query, params);
    return rows;

    } catch (error) {
        console.error("❌ Error reading posts", error);
        throw error;
    }
};

export const getPostById = async (db, post_id) => {
  try {
    const db = getDB();
    const query = `
      SELECT p.*, u.user_name 
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      WHERE p.post_id = ?
    `;

    const [rows] = await db.query(query, [post_id]);
    
    return rows[0] || null; // Si no hay resultados, devolvemos null
  } catch (error) {
    console.error("❌ Error reading post", error);
    throw error;
  }
};

export const deletePost = async (db, postId)=>{
    try {
      const db = getDB();
        const deletePostQuery = `
        delete from posts
        where post_id = ?`;

        const [result] = await db.query(deletePostQuery,[postId])
        
        console.log("✅ Comment deleted successfully:", result);
    return result;


    } catch (error) {
        console.error("❌ Error deleting post:", error)
    throw error;
    }
}

export const countposts = async (db, userId = null) =>{
  try {
    const db = getDB();
    let count = `SELECT COUNT(*) AS total FROM posts`;
    const params = [];
    if (userId) {
      count += ` WHERE user_id = ?`;
      params.push(userId);
    }
    const [rows] = await db.query(count, params);
    return rows[0].total;
    
  } catch (error) {
    console.error("❌ Error counting posts:", error);
    throw error;
    
  }
}
