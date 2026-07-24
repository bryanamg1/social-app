import { getDB } from "../config/db.js";
import { DEFAULT_POST_TYPE } from "../utils/postTypes.js";

const POST_SELECT_FIELDS = `
  p.*,
  u.user_name,
  u.avatar_url,
  CASE
    WHEN pp.post_id IS NULL THEN 0
    ELSE 1
  END AS is_pinned
`;

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

const buildPostsOrderClause = ({ userId = null, savedOrder = false } = {}) => {
  if (savedOrder) {
    return " ORDER BY is_pinned DESC, sp.created_at DESC";
  }

  if (userId) {
    return " ORDER BY is_pinned DESC, p.created_at DESC";
  }

  return " ORDER BY p.created_at DESC";
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
    const orderSql = buildPostsOrderClause({ userId });
    const query = `
      SELECT ${POST_SELECT_FIELDS}
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      LEFT JOIN pinned_posts pp
        ON pp.post_id = p.post_id
       AND pp.user_id = p.user_id
      ${whereSql}
      ${orderSql}
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
      SELECT ${POST_SELECT_FIELDS}
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      LEFT JOIN pinned_posts pp
        ON pp.post_id = p.post_id
       AND pp.user_id = p.user_id
      WHERE p.post_id = ?
    `;

    const [rows] = await database.query(query, [post_id]);
    
    return rows[0] || null; // Si no hay resultados, devolvemos null
  } catch (error) {
    console.error("❌ Error reading post", error);
    throw error;
  }
};

export const updatePost = async (db, { postId, userId, content, postType }) => {
  const database = db || getDB();
  const updateFields = [];
  const params = [];

  if (typeof content === "string") {
    updateFields.push("content = ?");
    params.push(content);
  }

  if (postType) {
    updateFields.push("post_type = ?");
    params.push(postType);
  }

  if (!updateFields.length) {
    return getPostById(database, postId);
  }

  await database.query(
    `
      UPDATE posts
      SET ${updateFields.join(", ")}
      WHERE post_id = ?
        AND user_id = ?
    `,
    [...params, postId, userId]
  );

  return getPostById(database, postId);
};

export const deletePost = async (db, postId) => {
  try {
    const database = db || getDB();
    await database.query(
      `
        DELETE FROM saved_posts
        WHERE post_id = ?
      `,
      [postId]
    );
    await database.query(
      `
        DELETE FROM pinned_posts
        WHERE post_id = ?
      `,
      [postId]
    );
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

export const getSavedPosts = async (
  db,
  { currentUserId, limit, offset, postType = null } = {}
) => {
  const database = db || getDB();
  const params = [currentUserId];
  const postTypeClause = postType ? " AND p.post_type = ?" : "";

  if (postType) {
    params.push(postType);
  }

  const orderSql = buildPostsOrderClause({ savedOrder: true });

  const [rows] = await database.query(
    `
      SELECT
        ${POST_SELECT_FIELDS},
        sp.created_at AS saved_at
      FROM saved_posts sp
      JOIN posts p ON p.post_id = sp.post_id
      JOIN users u ON u.user_id = p.user_id
      LEFT JOIN pinned_posts pp
        ON pp.post_id = p.post_id
       AND pp.user_id = p.user_id
      WHERE sp.user_id = ?
        ${postTypeClause}
      ${orderSql}
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  return rows;
};

export const countSavedPosts = async (
  db,
  { currentUserId, postType = null } = {}
) => {
  const database = db || getDB();
  const params = [currentUserId];
  const postTypeClause = postType ? " AND p.post_type = ?" : "";

  if (postType) {
    params.push(postType);
  }

  const [rows] = await database.query(
    `
      SELECT COUNT(*) AS total
      FROM saved_posts sp
      JOIN posts p ON p.post_id = sp.post_id
      WHERE sp.user_id = ?
        ${postTypeClause}
    `,
    params
  );

  return Number(rows?.[0]?.total) || 0;
};

export const getSavedPostIds = async (db, currentUserId) => {
  const database = db || getDB();
  const [rows] = await database.query(
    `
      SELECT post_id
      FROM saved_posts
      WHERE user_id = ?
      ORDER BY created_at DESC
    `,
    [currentUserId]
  );

  return rows.map((row) => Number(row.post_id)).filter(Boolean);
};

export const savePost = async (db, { currentUserId, postId }) => {
  const database = db || getDB();

  await database.query(
    `
      INSERT IGNORE INTO saved_posts (user_id, post_id)
      VALUES (?, ?)
    `,
    [currentUserId, postId]
  );

  return getSavedPostIds(database, currentUserId);
};

export const unsavePost = async (db, { currentUserId, postId }) => {
  const database = db || getDB();
  const [result] = await database.query(
    `
      DELETE FROM saved_posts
      WHERE user_id = ?
        AND post_id = ?
    `,
    [currentUserId, postId]
  );

  return result;
};

export const setPinnedPost = async (db, { currentUserId, postId, pinned }) => {
  const database = db || getDB();

  if (pinned) {
    await database.query(
      `
        INSERT IGNORE INTO pinned_posts (user_id, post_id)
        VALUES (?, ?)
      `,
      [currentUserId, postId]
    );
  } else {
    await database.query(
      `
        DELETE FROM pinned_posts
        WHERE user_id = ?
          AND post_id = ?
      `,
      [currentUserId, postId]
    );
  }

  return getPostById(database, postId);
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
