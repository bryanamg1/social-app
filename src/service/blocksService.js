import { getDB } from "../config/db.js";

const isBlocksSchemaMissing = (error) => {
  return (
    error?.code === "ER_NO_SUCH_TABLE" ||
    String(error?.message ?? "").includes("blocked_users")
  );
};

export const getUserBlockStatus = async (db, { currentUserId, targetUserId }) => {
  const database = db || getDB();
  try {
    const [rows] = await database.query(
      `
        SELECT
          MAX(CASE WHEN blocker_id = ? AND blocked_id = ? THEN 1 ELSE 0 END) AS is_blocked,
          MAX(CASE WHEN blocker_id = ? AND blocked_id = ? THEN 1 ELSE 0 END) AS is_blocked_by_user
        FROM blocked_users
        WHERE (blocker_id = ? AND blocked_id = ?)
           OR (blocker_id = ? AND blocked_id = ?)
      `,
      [
        currentUserId,
        targetUserId,
        targetUserId,
        currentUserId,
        currentUserId,
        targetUserId,
        targetUserId,
        currentUserId,
      ]
    );

    return {
      isBlocked: Boolean(Number(rows?.[0]?.is_blocked) || 0),
      isBlockedByUser: Boolean(Number(rows?.[0]?.is_blocked_by_user) || 0),
    };
  } catch (error) {
    if (!isBlocksSchemaMissing(error)) {
      throw error;
    }

    return {
      isBlocked: false,
      isBlockedByUser: false,
    };
  }
};

export const hasAnyUserBlock = async (db, { currentUserId, targetUserId }) => {
  const status = await getUserBlockStatus(db, { currentUserId, targetUserId });

  return status.isBlocked || status.isBlockedByUser;
};

export const blockUserById = async (db, { blockerId, blockedId }) => {
  const database = db || getDB();

  const [result] = await database.query(
    `
      INSERT IGNORE INTO blocked_users (blocker_id, blocked_id, created_at)
      VALUES (?, ?, NOW())
    `,
    [blockerId, blockedId]
  );

  await database.query(
    `
      DELETE FROM follows
      WHERE (follower_id = ? AND followed_id = ?)
         OR (follower_id = ? AND followed_id = ?)
    `,
    [blockerId, blockedId, blockedId, blockerId]
  );

  return {
    affectedRows: result?.affectedRows ?? 0,
  };
};

export const unblockUserById = async (db, { blockerId, blockedId }) => {
  const database = db || getDB();
  const [result] = await database.query(
    `
      DELETE FROM blocked_users
      WHERE blocker_id = ? AND blocked_id = ?
    `,
    [blockerId, blockedId]
  );

  return {
    affectedRows: result?.affectedRows ?? 0,
  };
};
