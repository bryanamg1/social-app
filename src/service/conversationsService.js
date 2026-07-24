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

const isReadStateSchemaMissing = (error) => {
  return (
    error?.code === "ER_BAD_FIELD_ERROR" ||
    String(error?.message ?? "").includes("read_at") ||
    String(error?.message ?? "").includes("read_by_user_id")
  );
};

export const createConversation = async (db) => {
  const [result] = await db.query(`INSERT INTO conversations () VALUES ()`);
  return result.insertId;
};

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

export const getConversationRecipientUserId = async (db, conversationId, userId) => {
  const [rows] = await db.query(
    `
    SELECT user_id
    FROM conversation_users
    WHERE conversation_id = ? AND user_id <> ?
    LIMIT 1
    `,
    [conversationId, userId]
  );

  return rows[0]?.user_id ?? null;
};

export const getMessagesByConversation = async (db, conversationId, limit = 50, offset = 0) => {
  try {
    const [rows] = await db.query(
      `
      SELECT
        message_id,
        conversation_id,
        sender_id,
        content,
        created_at,
        modified_at,
        read_at,
        read_by_user_id
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
      LIMIT ? OFFSET ?
      `,
      [conversationId, limit, offset]
    );
    return rows;
  } catch (error) {
    if (!isReadStateSchemaMissing(error)) {
      throw error;
    }

    const [rows] = await db.query(
      `
      SELECT message_id, conversation_id, sender_id, content, created_at, modified_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
      LIMIT ? OFFSET ?
      `,
      [conversationId, limit, offset]
    );

    return rows.map((row) => ({
      ...row,
      read_at: null,
      read_by_user_id: null,
    }));
  }
};

export const getUserConversations = async (db, userId) => {
  try {
    const [rows] = await db.query(
      `
      SELECT
        c.conversation_id,
        c.created_at,
        c.modified_at,
        participant.user_id AS participant_user_id,
        participant.user_name AS participant_user_name,
        participant.email AS participant_email,
        participant.avatar_url AS participant_avatar_url,
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
        ) AS last_message_at,
        (
          SELECT m.sender_id
          FROM messages m
          WHERE m.conversation_id = c.conversation_id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_message_sender_id,
        (
          SELECT m.read_at
          FROM messages m
          WHERE m.conversation_id = c.conversation_id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_message_read_at,
        (
          SELECT COUNT(*)
          FROM messages m
          WHERE m.conversation_id = c.conversation_id
            AND m.sender_id <> ?
            AND m.read_at IS NULL
        ) AS unread_count
      FROM conversations c
      JOIN conversation_users cu
        ON cu.conversation_id = c.conversation_id
      LEFT JOIN conversation_users participant_cu
        ON participant_cu.conversation_id = c.conversation_id
        AND participant_cu.user_id <> cu.user_id
      LEFT JOIN users participant
        ON participant.user_id = participant_cu.user_id
      WHERE cu.user_id = ?
      ORDER BY COALESCE(last_message_at, c.modified_at, c.created_at) DESC
      `,
      [userId, userId]
    );

    return rows;
  } catch (error) {
    if (!isReadStateSchemaMissing(error)) {
      throw error;
    }

    const [rows] = await db.query(
      `
      SELECT
        c.conversation_id,
        c.created_at,
        c.modified_at,
        participant.user_id AS participant_user_id,
        participant.user_name AS participant_user_name,
        participant.email AS participant_email,
        participant.avatar_url AS participant_avatar_url,
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
      LEFT JOIN conversation_users participant_cu
        ON participant_cu.conversation_id = c.conversation_id
        AND participant_cu.user_id <> cu.user_id
      LEFT JOIN users participant
        ON participant.user_id = participant_cu.user_id
      WHERE cu.user_id = ?
      ORDER BY COALESCE(last_message_at, c.modified_at, c.created_at) DESC
      `,
      [userId]
    );

    return rows.map((row) => ({
      ...row,
      last_message_sender_id: null,
      last_message_read_at: null,
      unread_count: 0,
    }));
  }
};

export const markConversationMessagesRead = async (db, conversationId, userId) => {
  try {
    const [result] = await db.query(
      `
      UPDATE messages
      SET read_at = CURRENT_TIMESTAMP,
          read_by_user_id = ?
      WHERE conversation_id = ?
        AND sender_id <> ?
        AND read_at IS NULL
      `,
      [userId, conversationId, userId]
    );

    return {
      affectedRows: result?.affectedRows ?? 0,
      read_at: new Date().toISOString(),
    };
  } catch (error) {
    if (!isReadStateSchemaMissing(error)) {
      throw error;
    }

    return {
      affectedRows: 0,
      read_at: null,
    };
  }
};
