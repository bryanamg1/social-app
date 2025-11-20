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

export const readComments = async (db, post_id) =>{
    try {
        const readCommentsQuery = `
        SELECT * FROM  comments
        WHERE post_id = ?
        `;

        const [result] = await db.query(readCommentsQuery, [post_id]);

        console.log("✅ Comments retrieved successfully:", result);
        return result;

    } catch (error) {
    console.error("❌ Error reading comments:", error);
    throw error;
  }
}