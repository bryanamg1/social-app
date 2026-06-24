export const insertMessage = async (db, conversationId, senderId, content) => {
  const [result] = await db.query(
    `INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)`,
    [conversationId, senderId, content]
  );

  const messageId = result.insertId;

  await db.query(
    `UPDATE conversations SET modified_at = CURRENT_TIMESTAMP WHERE conversation_id = ?`,
    [conversationId]
  );

  const [rows] = await db.query(
    `SELECT message_id, conversation_id, sender_id, content, created_at, modified_at
     FROM messages WHERE message_id = ?`,
    [messageId]
  );

  return rows[0] || null;
};
