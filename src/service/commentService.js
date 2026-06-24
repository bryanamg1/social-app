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
