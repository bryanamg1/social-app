const NOTIFICATION_TYPES = Object.freeze({
  FOLLOW_USER: "FOLLOW_USER",
  COMMENT_POST: "COMMENT_POST",
  REACTION_POST: "REACTION_POST",
  REACTION_COMMENT: "REACTION_COMMENT",
  REPLY_COMMENT: "REPLY_COMMENT",
  REPOST: "REPOST",
  MENTION_USER: "MENTION_USER",
  MESSAGE: "MESSAGE",
});

export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  follow_user: true,
  comment_post: true,
  reaction_post: true,
  reaction_comment: true,
  reply_comment: true,
  repost: true,
  mention_user: true,
  message: true,
});

const TYPE_TO_PREFERENCE_KEY = Object.freeze({
  [NOTIFICATION_TYPES.FOLLOW_USER]: "follow_user",
  [NOTIFICATION_TYPES.COMMENT_POST]: "comment_post",
  [NOTIFICATION_TYPES.REACTION_POST]: "reaction_post",
  [NOTIFICATION_TYPES.REACTION_COMMENT]: "reaction_comment",
  [NOTIFICATION_TYPES.REPLY_COMMENT]: "reply_comment",
  [NOTIFICATION_TYPES.REPOST]: "repost",
  [NOTIFICATION_TYPES.MENTION_USER]: "mention_user",
  [NOTIFICATION_TYPES.MESSAGE]: "message",
});

const PREFERENCE_COLUMNS = Object.keys(DEFAULT_NOTIFICATION_PREFERENCES);

const LEGACY_NOTIFICATION_TYPE_ALIASES = Object.freeze({
  follow: NOTIFICATION_TYPES.FOLLOW_USER,
  comment: NOTIFICATION_TYPES.COMMENT_POST,
  reaction: NOTIFICATION_TYPES.REACTION_POST,
  message: NOTIFICATION_TYPES.MESSAGE,
});

const normalizeBoolean = (value, fallback) => {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return Boolean(Number(value));
};

const isPreferencesSchemaMissing = (error) => {
  return (
    error?.code === "ER_NO_SUCH_TABLE" ||
    error?.code === "ER_BAD_FIELD_ERROR" ||
    String(error?.message ?? "").includes("notification_preferences")
  );
};

export const normalizeNotificationPreferences = (row = {}) => {
  return {
    user_id: Number(row.user_id ?? row.userId ?? 0) || null,
    ...PREFERENCE_COLUMNS.reduce((accumulator, key) => {
      return {
        ...accumulator,
        [key]: normalizeBoolean(row[key], DEFAULT_NOTIFICATION_PREFERENCES[key]),
      };
    }, {}),
  };
};

const normalizeNotificationType = (type) => {
  const rawType = String(type ?? "").trim();

  if (!rawType) {
    return "";
  }

  return LEGACY_NOTIFICATION_TYPE_ALIASES[rawType.toLowerCase()] ?? rawType;
};

const insertDefaultPreferences = async (db, userId) => {
  try {
    await db.query(
      `
        INSERT IGNORE INTO notification_preferences (
          user_id,
          follow_user,
          comment_post,
          reaction_post,
          reaction_comment,
          reply_comment,
          repost,
          mention_user,
          message
        )
        VALUES (?, 1, 1, 1, 1, 1, 1, 1, 1)
      `,
      [userId]
    );
  } catch (error) {
    if (isPreferencesSchemaMissing(error)) {
      return;
    }

    throw error;
  }
};

export const getNotificationPreferences = async (db, userId) => {
  await insertDefaultPreferences(db, userId);

  try {
    const [rows] = await db.query(
      `
        SELECT
          user_id,
          follow_user,
          comment_post,
          reaction_post,
          reaction_comment,
          reply_comment,
          repost,
          mention_user,
          message
        FROM notification_preferences
        WHERE user_id = ?
        LIMIT 1
      `,
      [userId]
    );

    return normalizeNotificationPreferences({
      user_id: userId,
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(rows[0] ?? {}),
    });
  } catch (error) {
    if (isPreferencesSchemaMissing(error)) {
      return normalizeNotificationPreferences({
        user_id: userId,
        ...DEFAULT_NOTIFICATION_PREFERENCES,
      });
    }

    throw error;
  }
};

export const updateNotificationPreferences = async (db, userId, changes = {}) => {
  const normalizedChanges = Object.entries(changes).reduce((accumulator, [key, value]) => {
    if (!PREFERENCE_COLUMNS.includes(key)) {
      return accumulator;
    }

    return {
      ...accumulator,
      [key]: normalizeBoolean(value, DEFAULT_NOTIFICATION_PREFERENCES[key]),
    };
  }, {});

  await insertDefaultPreferences(db, userId);

  if (Object.keys(normalizedChanges).length === 0) {
    return getNotificationPreferences(db, userId);
  }

  const assignments = Object.keys(normalizedChanges)
    .map((key) => `${key} = ?`)
    .join(", ");
  const values = Object.keys(normalizedChanges).map((key) =>
    normalizedChanges[key] ? 1 : 0
  );

  try {
    await db.query(
      `UPDATE notification_preferences SET ${assignments} WHERE user_id = ?`,
      [...values, userId]
    );
  } catch (error) {
    if (isPreferencesSchemaMissing(error)) {
      return normalizeNotificationPreferences({
        user_id: userId,
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...normalizedChanges,
      });
    }

    throw error;
  }

  return getNotificationPreferences(db, userId);
};

export const isNotificationTypeEnabled = async (db, userId, type) => {
  const normalizedType = normalizeNotificationType(type);
  const preferenceKey = TYPE_TO_PREFERENCE_KEY[normalizedType];

  if (!preferenceKey) {
    return true;
  }

  const preferences = await getNotificationPreferences(db, userId);

  return Boolean(preferences[preferenceKey]);
};
