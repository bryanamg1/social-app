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

  try {
    const [rows] = await db.query(
      `SELECT
        message_id,
        conversation_id,
        sender_id,
        content,
        created_at,
        modified_at,
        read_at,
        read_by_user_id
       FROM messages WHERE message_id = ?`,
      [messageId]
    );

    return rows[0] || null;
  } catch (error) {
    if (
      error?.code !== "ER_BAD_FIELD_ERROR" &&
      !String(error?.message ?? "").includes("read_at")
    ) {
      throw error;
    }

    const [rows] = await db.query(
      `SELECT message_id, conversation_id, sender_id, content, created_at, modified_at
       FROM messages WHERE message_id = ?`,
      [messageId]
    );

    return rows[0]
      ? {
          ...rows[0],
          read_at: null,
          read_by_user_id: null,
        }
      : null;
  }
};
