import { getDB } from "../config/db.js";
import { getIO } from "../sockets/sockets.js";
import { isNotificationTypeEnabled } from "./notificationPreferencesService.js";

export const NOTIFICATION_TYPES = Object.freeze({
  FOLLOW_USER: "FOLLOW_USER",
  COMMENT_POST: "COMMENT_POST",
  REACTION_POST: "REACTION_POST",
  REACTION_COMMENT: "REACTION_COMMENT",
  REPLY_COMMENT: "REPLY_COMMENT",
  REPOST: "REPOST",
  MENTION_USER: "MENTION_USER",
  MESSAGE: "MESSAGE",
});

const LEGACY_NOTIFICATION_TYPE_ALIASES = Object.freeze({
  follow: NOTIFICATION_TYPES.FOLLOW_USER,
  comment: NOTIFICATION_TYPES.COMMENT_POST,
  reaction: NOTIFICATION_TYPES.REACTION_POST,
  message: NOTIFICATION_TYPES.MESSAGE,
});

const VALID_NOTIFICATION_TYPES = new Set(Object.values(NOTIFICATION_TYPES));
const POST_CONTEXT_NOTIFICATION_TYPES = [
  NOTIFICATION_TYPES.COMMENT_POST,
  NOTIFICATION_TYPES.REACTION_POST,
  NOTIFICATION_TYPES.REPOST,
  NOTIFICATION_TYPES.MENTION_USER,
];
const COMMENT_CONTEXT_NOTIFICATION_TYPES = [
  NOTIFICATION_TYPES.REACTION_COMMENT,
  NOTIFICATION_TYPES.REPLY_COMMENT,
];

const buildNotificationsBaseQuery = () => {
  const postTypeList = POST_CONTEXT_NOTIFICATION_TYPES.map((type) => `'${type}'`).join(", ");
  const commentTypeList = COMMENT_CONTEXT_NOTIFICATION_TYPES.map((type) => `'${type}'`).join(", ");

  return `
    SELECT
      n.id,
      n.user_id,
      n.type,
      n.relate_id,
      n.from_userId,
      n.from_userId AS from_user_id,
      n.seen,
      n.created_at,
      actor.user_name AS from_user_name,
      actor.avatar_url AS from_user_avatar_url,
      actor.email AS from_user_email,
      post_context.post_id AS post_id,
      post_context.content AS post_content,
      comment_context.comment_id AS comment_id,
      comment_context.comment_text AS comment_content,
      conversation_context.conversation_id AS conversation_id,
      message_context.message_id AS message_id,
      message_context.content AS message_preview
    FROM notifications n
    LEFT JOIN users actor
      ON actor.user_id = n.from_userId
    LEFT JOIN posts post_context
      ON post_context.post_id = CASE
        WHEN n.type IN (${postTypeList}) THEN n.relate_id
        ELSE NULL
      END
    LEFT JOIN comments comment_context
      ON comment_context.comment_id = CASE
        WHEN n.type IN (${commentTypeList}) THEN n.relate_id
        ELSE NULL
      END
    LEFT JOIN conversations conversation_context
      ON conversation_context.conversation_id = CASE
        WHEN n.type = '${NOTIFICATION_TYPES.MESSAGE}' THEN n.relate_id
        ELSE NULL
      END
    LEFT JOIN messages message_context
      ON message_context.message_id = (
        SELECT m.message_id
        FROM messages m
        WHERE m.conversation_id = conversation_context.conversation_id
        ORDER BY m.created_at DESC
        LIMIT 1
      )
  `;
};

export const normalizeNotificationType = (type) => {
  const rawType = String(type ?? "").trim();

  if (!rawType) {
    return "";
  }

  if (VALID_NOTIFICATION_TYPES.has(rawType)) {
    return rawType;
  }

  return LEGACY_NOTIFICATION_TYPE_ALIASES[rawType.toLowerCase()] ?? rawType;
};

const getUnreadNotificationCount = async (db, userId) => {
  const [[{ total }]] = await db.query(
    "SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND seen = 0",
    [userId]
  );

  return total;
};

const getNotificationById = async (db, notificationId, userId = null) => {
  const params = [notificationId];
  const userFilter = userId === null ? "" : " AND n.user_id = ?";

  if (userId !== null) {
    params.push(userId);
  }

  const [rows] = await db.query(
    `
      ${buildNotificationsBaseQuery()}
      WHERE n.id = ?${userFilter}
      LIMIT 1
    `,
    params
  );

  return rows[0] ?? null;
};

export const createNotification = async (
  userId,
  type,
  relateId,
  from_userId,
  dbConnection = getDB(),
  ioInstance = getIO()
) => {
  const db = dbConnection;
  const io = ioInstance;
  const recipientUserId = Number(userId);
  const normalizedType = normalizeNotificationType(type);
  const actorUserId =
    from_userId === null || from_userId === undefined
      ? null
      : Number(from_userId);

  if (
    Number.isNaN(recipientUserId) ||
    !normalizedType ||
    !VALID_NOTIFICATION_TYPES.has(normalizedType) ||
    (actorUserId !== null && Number.isNaN(actorUserId))
  ) {
    return null;
  }

  if (actorUserId !== null && recipientUserId === actorUserId) {
    return null;
  }

  const notificationsEnabled = await isNotificationTypeEnabled(
    db,
    recipientUserId,
    normalizedType
  );

  if (!notificationsEnabled) {
    return null;
  }

  const [result] = await db.query(
    "INSERT INTO notifications (user_id, type, relate_id, from_userId) VALUES (?,?,?,?)",
    [recipientUserId, normalizedType, relateId, actorUserId]
  );

  const notification = await getNotificationById(db, result.insertId, recipientUserId);

  io
    .of("/notifications")
    .to(`user_${recipientUserId}`)
    .emit("notification:new", notification);

  const total = await getUnreadNotificationCount(db, recipientUserId);

  io
    .of("/notifications")
    .to(`user_${recipientUserId}`)
    .emit("notification:count", { total });

  return notification?.id ?? result.insertId;
};

export const getnotifications = async (userId, dbConnection = getDB()) => {
  const db = dbConnection;
  const [rows] = await db.query(
    `
      ${buildNotificationsBaseQuery()}
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
    `,
    [userId]
  );
  return rows;
};

export const markseen = async (
  notificationId,
  userId,
  dbConnection = getDB(),
  ioInstance = getIO()
) => {
  const db = dbConnection;
  const io = ioInstance;

  await db.query("UPDATE notifications SET seen = 1 WHERE id = ? AND user_id = ?", [
    notificationId,
    userId,
  ]);

  const notification = await getNotificationById(db, notificationId, userId);
  const total = await getUnreadNotificationCount(db, userId);

  io.of("/notifications").to(`user_${userId}`).emit("notification:count", { total });

  return notification;
};

export const markallseen = async (
  userId,
  dbConnection = getDB(),
  ioInstance = getIO()
) => {
  const db = dbConnection;
  const io = ioInstance;
  const [result] = await db.query("UPDATE notifications SET seen = 1 WHERE user_id = ?", [
    userId,
  ]);

  io.of("/notifications").to(`user_${userId}`).emit("notification:count", { total: 0 });

  return {
    affectedRows: result?.affectedRows ?? 0,
  };
};
