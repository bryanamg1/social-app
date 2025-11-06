export const insertPost = async(db, postData, userId) =>{
    try {
        const inserPostQuery = 
        `INSERT INTO posts (user_id, content, image_url)
        VALUES (?, ?, ?)
        `;

        const {content, image_url} = postData;

        const result = await db.query(inserPostQuery, [userId, content, image_url]);
        console.log("✅ Post inserted successfully", result)
        return result;

    } catch (error) {
        console.error("❌ Error inserting post", error);
        throw error;
    }
}