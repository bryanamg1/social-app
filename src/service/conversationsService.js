export const findConversationBetweenTwoUsers = async (db, userA, userB) => {
  const [rows] = await db.query(
    `
    SELECT cu1.conversation_id
    FROM conversation_users cu1
    JOIN conversation_users cu2
      ON cu1.conversation_id = cu2.conversation_id
    WHERE cu1.user_id = ? AND cu2.user_id = ?
    LIMIT 1
    `,
    [userA, userB]
  );
  return rows[0]?.conversation_id || null;
};


export const createConversation = async (db) => {
    const [result] = await db.query(`insert into conversations () values ()`);
    return result.insertId; 
}

export const addUsersToConversation = async (db, conversationId, userIds) => {
  const values = userIds.map((uid) => [conversationId, uid]);

  await db.query(
    `INSERT IGNORE INTO conversation_users (conversation_id, user_id) VALUES ?`,
    [values]
  );
};

export const userBelongsToConversation = async (db, conversationId, userId) => {
  const [rows] = await db.query(
    `SELECT 1 FROM conversation_users WHERE conversation_id = ? AND user_id = ? LIMIT 1`,
    [conversationId, userId]
  );
  return rows.length > 0;
};

export const getMessagesByConversation = async (db, conversationId, limit = 50, offset = 0) => {
  const [rows] = await db.query(
    `
    SELECT message_id, conversation_id, sender_id, content, created_at, seen
    FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
    LIMIT ? OFFSET ?
    `,
    [conversationId, limit, offset]
  );
  return rows;
};

export const getUserConversations = async (db, userId) => {
  const [rows] = await db.query(
    `
    SELECT
      c.conversation_id,
      c.created_at,
      (
        SELECT m.content
        FROM messages m
        WHERE m.conversation_id = c.conversation_id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS last_message,
      (
        SELECT m.created_at
        FROM messages m
        WHERE m.conversation_id = c.conversation_id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS last_message_at
    FROM conversations c
    JOIN conversation_users cu
      ON cu.conversation_id = c.conversation_id
    WHERE cu.user_id = ?
    ORDER BY last_message_at DESC
    `,
    [userId]
  );

  return rows;
};