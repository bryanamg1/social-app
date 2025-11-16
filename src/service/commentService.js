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