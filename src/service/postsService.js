import { getDB } from "../config/db.js";
import { DEFAULT_POST_TYPE } from "../utils/postTypes.js";

const buildPostsWhereClause = ({ userId = null, postType = null } = {}) => {
  const clauses = [];
  const params = [];

  if (userId) {
    clauses.push("p.user_id = ?");
    params.push(userId);
  }

  if (postType) {
    clauses.push("p.post_type = ?");
    params.push(postType);
  }

  return {
    whereSql: clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
};

export const insertPost = async (db, postData, userId, image_url) => {
  try {
    const database = db || getDB();
    const insertPostQuery = `
      INSERT INTO posts (user_id, content, image_url, post_type)
      VALUES (?, ?, ?, ?)
    `;

    const content = String(postData?.content ?? "");
    const postType = postData?.post_type ?? DEFAULT_POST_TYPE;

    const [result] = await database.query(insertPostQuery, [
      userId,
      content,
      image_url,
      postType,
    ]);

    console.log("✅ Post inserted successfully", result);
    return result;
  } catch (error) {
    console.error("❌ Error inserting post", error);
    throw error;
  }
};

export const getPosts = async (
  db,
  { limit, offset, userId = null, postType = null } = {}
) => {
  try {
    const database = db || getDB();
    const { whereSql, params } = buildPostsWhereClause({ userId, postType });
    const query = `
      SELECT p.*, u.user_name, u.avatar_url
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      ${whereSql}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await database.query(query, [...params, limit, offset]);
    return rows;
  } catch (error) {
    console.error("❌ Error reading posts", error);
    throw error;
  }
};

export const getPostById = async (db, post_id) => {
  try {
    const database = db || getDB();
    const query = `
      SELECT p.*, u.user_name, u.avatar_url
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      WHERE p.post_id = ?
    `;

    const [rows] = await database.query(query, [post_id]);
    
    return rows[0] || null; // Si no hay resultados, devolvemos null
  } catch (error) {
    console.error("❌ Error reading post", error);
    throw error;
  }
};

export const deletePost = async (db, postId) => {
  try {
    const database = db || getDB();
    const deletePostQuery = `
      DELETE FROM posts
      WHERE post_id = ?
    `;

    const [result] = await database.query(deletePostQuery, [postId]);

    console.log("✅ Comment deleted successfully:", result);
    return result;
  } catch (error) {
    console.error("❌ Error deleting post:", error);
    throw error;
  }
};

export const countposts = async (
  db,
  { userId = null, postType = null } = {}
) => {
  try {
    const database = db || getDB();
    const { whereSql, params } = buildPostsWhereClause({ userId, postType });
    const countQuery = `SELECT COUNT(*) AS total FROM posts p${whereSql}`;
    const [rows] = await database.query(countQuery, params);

    return rows[0].total;
  } catch (error) {
    console.error("❌ Error counting posts:", error);
    throw error;
  }
};
