export const insertMessage = async (db, conversationId, senderId, content)=>{
    const [result] = await db.query(
    `INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)`,
    [conversationId, senderId, content]
  );

    const messageId = result.insertId;

    const [rows] = await db.query(
        `SELECT message_id, conversation_id, sender_id, content, created_at, seen
     FROM messages WHERE message_id = ?`,
    [messageId]
    );

    return rows[0]
}