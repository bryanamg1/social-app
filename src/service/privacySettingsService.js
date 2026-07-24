import { getDB } from "../config/db.js";

export const PRIVACY_PROFILE_VISIBILITY = {
  PUBLIC: "public",
  FOLLOWERS: "followers",
};

export const PRIVACY_DIRECT_MESSAGE_PERMISSION = {
  EVERYONE: "everyone",
  FOLLOWERS: "followers",
};

export const DEFAULT_PRIVACY_SETTINGS = {
  profile_visibility: PRIVACY_PROFILE_VISIBILITY.PUBLIC,
  direct_message_permission: PRIVACY_DIRECT_MESSAGE_PERMISSION.EVERYONE,
};

const isPrivacySettingsSchemaMissing = (error) => {
  return (
    error?.code === "ER_NO_SUCH_TABLE" ||
    String(error?.message ?? "").includes("user_privacy_settings")
  );
};

const normalizePrivacyValue = (value) => {
  return String(value ?? "")
    .trim()
    .toLowerCase();
};

export const normalizePrivacySettingsInput = (settings = {}) => {
  const profileVisibility = normalizePrivacyValue(
    settings.profile_visibility ?? settings.profileVisibility
  );
  const directMessagePermission = normalizePrivacyValue(
    settings.direct_message_permission ?? settings.directMessagePermission
  );

  return {
    profile_visibility: Object.values(PRIVACY_PROFILE_VISIBILITY).includes(
      profileVisibility
    )
      ? profileVisibility
      : null,
    direct_message_permission: Object.values(
      PRIVACY_DIRECT_MESSAGE_PERMISSION
    ).includes(directMessagePermission)
      ? directMessagePermission
      : null,
  };
};

export const getUserPrivacySettings = async (db, userId) => {
  const database = db || getDB();

  try {
    const [rows] = await database.query(
      `
        SELECT profile_visibility, direct_message_permission
        FROM user_privacy_settings
        WHERE user_id = ?
        LIMIT 1
      `,
      [userId]
    );

    if (!rows?.length) {
      return DEFAULT_PRIVACY_SETTINGS;
    }

    const normalized = normalizePrivacySettingsInput(rows[0]);

    return {
      profile_visibility:
        normalized.profile_visibility ??
        DEFAULT_PRIVACY_SETTINGS.profile_visibility,
      direct_message_permission:
        normalized.direct_message_permission ??
        DEFAULT_PRIVACY_SETTINGS.direct_message_permission,
    };
  } catch (error) {
    if (!isPrivacySettingsSchemaMissing(error)) {
      throw error;
    }

    return DEFAULT_PRIVACY_SETTINGS;
  }
};

export const updateUserPrivacySettings = async (db, userId, settings) => {
  const database = db || getDB();
  const normalized = normalizePrivacySettingsInput(settings);

  await database.query(
    `
      INSERT INTO user_privacy_settings (
        user_id,
        profile_visibility,
        direct_message_permission,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        profile_visibility = VALUES(profile_visibility),
        direct_message_permission = VALUES(direct_message_permission),
        updated_at = NOW()
    `,
    [
      userId,
      normalized.profile_visibility ??
        DEFAULT_PRIVACY_SETTINGS.profile_visibility,
      normalized.direct_message_permission ??
        DEFAULT_PRIVACY_SETTINGS.direct_message_permission,
    ]
  );

  return getUserPrivacySettings(database, userId);
};

const isFollowingUser = async (db, followerId, followedId) => {
  const [rows] = await db.query(
    `
      SELECT 1
      FROM follows
      WHERE follower_id = ? AND followed_id = ?
      LIMIT 1
    `,
    [followerId, followedId]
  );

  return rows.length > 0;
};

export const canViewUserProfile = async (db, { viewerUserId, targetUserId }) => {
  if (Number(viewerUserId) === Number(targetUserId)) {
    return true;
  }

  const privacySettings = await getUserPrivacySettings(db, targetUserId);

  if (
    privacySettings.profile_visibility === PRIVACY_PROFILE_VISIBILITY.PUBLIC
  ) {
    return true;
  }

  if (!viewerUserId) {
    return false;
  }

  return isFollowingUser(db, viewerUserId, targetUserId);
};

export const canSendDirectMessage = async (db, { senderUserId, recipientUserId }) => {
  if (Number(senderUserId) === Number(recipientUserId)) {
    return false;
  }

  const privacySettings = await getUserPrivacySettings(db, recipientUserId);

  if (
    privacySettings.direct_message_permission ===
    PRIVACY_DIRECT_MESSAGE_PERMISSION.EVERYONE
  ) {
    return true;
  }

  return isFollowingUser(db, senderUserId, recipientUserId);
};
