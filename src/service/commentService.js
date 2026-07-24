export const insertComment = async (db,comment_text, parent_comment_id, postId, userId) =>{
    try {
        const insertCommentQuery = `
        INSERT INTO comments (post_id, user_id, parent_comment_id, comment_text)
        VALUES (?, ?, ?, ?)
        `

        const result = await db.query(insertCommentQuery, [postId, userId, parent_comment_id, comment_text])
        
        console.log("✅ Comment inserted successfully:", result);
        return result;
    } catch (error) {
        console.error("❌ Error inserting comment:", error);
    throw error;
    }
}

export const readComments = async (db, postId) =>{
    try {
        const readCommentsQuery = `
        SELECT
            c.*,
            u.user_name,
            u.email,
            u.avatar_url
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.user_id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
        `;

        const [result] = await db.query(readCommentsQuery, [postId]);

        console.log("✅ Comments retrieved successfully:", result);
        return result;

    } catch (error) {
    console.error("❌ Error reading comments:", error);
    throw error;
  }
}
export const getCommentById = async (db, commentId) => {
    const query = `
        SELECT
            c.*,
            u.user_name,
            u.email,
            u.avatar_url
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.user_id
        WHERE c.comment_id = ?
        LIMIT 1
    `;

    const [rows] = await db.query(query, [commentId]);

    return rows[0] || null;
};

export const updateCommentText = async (db, { commentId, userId, commentText }) => {
    await db.query(
        `
            UPDATE comments
            SET comment_text = ?
            WHERE comment_id = ?
              AND user_id = ?
        `,
        [commentText, commentId, userId]
    );

    return getCommentById(db, commentId);
};

export const deleteCommentThread = async (db, commentId) => {
    const [commentTreeRows] = await db.query(
        `
            WITH RECURSIVE comment_tree AS (
                SELECT comment_id
                FROM comments
                WHERE comment_id = ?
                UNION ALL
                SELECT c.comment_id
                FROM comments c
                JOIN comment_tree ct ON c.parent_comment_id = ct.comment_id
            )
            SELECT comment_id
            FROM comment_tree
        `,
        [commentId]
    );

    const commentIds = commentTreeRows
        .map((row) => Number(row.comment_id))
        .filter(Boolean);

    if (!commentIds.length) {
        return { affectedRows: 0 };
    }

    const placeholders = commentIds.map(() => "?").join(", ");

    await db.query(
        `
            DELETE FROM comment_reactions
            WHERE comment_id IN (${placeholders})
        `,
        commentIds
    );

    const [result] = await db.query(
        `
            DELETE FROM comments
            WHERE comment_id IN (${placeholders})
        `,
        commentIds
    );

    return result;
};
