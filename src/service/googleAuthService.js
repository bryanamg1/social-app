import bcrypt from "bcryptjs";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";

import { AppError } from "../utils/utils.js";

const DEFAULT_AUTH_PROVIDER = "local";
const GOOGLE_AUTH_PROVIDER = "google";
const USERNAME_FALLBACK = "user";
const MAX_USERNAME_LENGTH = 100;

let googleClient = null;
let googleClientId = null;

const getConfiguredGoogleClientId = () => {
  return process.env.GOOGLE_CLIENT_ID?.trim() || "";
};

const getGoogleClient = () => {
  const clientId = getConfiguredGoogleClientId();

  if (!clientId) {
    return null;
  }

  if (!googleClient || googleClientId !== clientId) {
    googleClient = new OAuth2Client(clientId);
    googleClientId = clientId;
  }

  return googleClient;
};

const normalizeEmail = (email) => {
  return `${email || ""}`.trim().toLowerCase();
};

const sanitizeUserNameSource = (value) => {
  return `${value || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_USERNAME_LENGTH);
};

const buildUserNameBase = ({ name, givenName, email }) => {
  return (
    sanitizeUserNameSource(name) ||
    sanitizeUserNameSource(givenName) ||
    sanitizeUserNameSource(normalizeEmail(email).split("@")[0]) ||
    USERNAME_FALLBACK
  );
};

const buildRandomPasswordHash = async () => {
  const randomPassword = crypto.randomBytes(32).toString("hex");
  return bcrypt.hash(randomPassword, 10);
};

export const getMissingGoogleAuthEnvVars = () => {
  return [
    !getConfiguredGoogleClientId() && "GOOGLE_CLIENT_ID",
  ].filter(Boolean);
};

export const isGoogleAuthConfigured = () => {
  return getMissingGoogleAuthEnvVars().length === 0;
};

export const buildGoogleAuthColumnsSql = () => {
  return [
    "ALTER TABLE users",
    "ADD COLUMN google_sub VARCHAR(255) NULL UNIQUE AFTER email,",
    "ADD COLUMN auth_provider VARCHAR(30) NOT NULL DEFAULT 'local' AFTER google_sub,",
    "ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER auth_provider;",
  ].join("\n");
};

const getGoogleAuthSelectFields = () => {
  return [
    "user_id",
    "user_name",
    "email",
    "password",
    "bio",
    "avatar_url",
    "location",
    "created_at",
    "modified_at",
    "google_sub",
    "auth_provider",
    "email_verified",
  ].join(", ");
};

const buildGoogleProfile = (payload) => {
  return {
    googleSub: payload.sub,
    email: normalizeEmail(payload.email),
    emailVerified: Boolean(payload.email_verified),
    name: payload.name || "",
    givenName: payload.given_name || "",
    familyName: payload.family_name || "",
    picture: payload.picture || "",
  };
};

const createGoogleAuthError = ({
  code,
  message,
  status,
  details = null,
}) => {
  return new AppError({
    code,
    message,
    status,
    details,
  });
};

const findUserByGoogleSub = async (db, googleSub) => {
  const [rows] = await db.execute(
    `SELECT ${getGoogleAuthSelectFields()} FROM users WHERE google_sub = ? LIMIT 1`,
    [googleSub]
  );

  return rows[0] || null;
};

const findUserByEmail = async (db, email) => {
  const [rows] = await db.execute(
    `SELECT ${getGoogleAuthSelectFields()} FROM users WHERE email = ? LIMIT 1`,
    [email]
  );

  return rows[0] || null;
};

const updateGoogleLinkedUser = async (db, user, googleProfile) => {
  await db.execute(
    `UPDATE users
      SET google_sub = ?,
          auth_provider = ?,
          email_verified = ?,
          avatar_url = CASE
            WHEN (avatar_url IS NULL OR avatar_url = '') AND ? <> '' THEN ?
            ELSE avatar_url
          END
      WHERE user_id = ?`,
    [
      googleProfile.googleSub,
      GOOGLE_AUTH_PROVIDER,
      googleProfile.emailVerified ? 1 : 0,
      googleProfile.picture,
      googleProfile.picture,
      user.user_id,
    ]
  );

  return findUserByEmail(db, googleProfile.email);
};

export const generateAvailableUserName = async (db, googleProfile) => {
  const baseUserName = buildUserNameBase(googleProfile);
  let nextUserName = baseUserName;
  let nextSuffix = 1;

  while (true) {
    const [rows] = await db.execute(
      "SELECT user_id FROM users WHERE user_name = ? LIMIT 1",
      [nextUserName]
    );

    if (!rows.length) {
      return nextUserName;
    }

    const suffix = `_${nextSuffix}`;
    const trimmedBase = baseUserName.slice(
      0,
      MAX_USERNAME_LENGTH - suffix.length
    );

    nextUserName = `${trimmedBase || USERNAME_FALLBACK}${suffix}`;
    nextSuffix += 1;
  }
};

const createGoogleUser = async (db, googleProfile) => {
  const generatedUserName = await generateAvailableUserName(db, googleProfile);
  const generatedPasswordHash = await buildRandomPasswordHash();
  const [result] = await db.execute(
    `INSERT INTO users
      (user_name, email, password, avatar_url, google_sub, auth_provider, email_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      generatedUserName,
      googleProfile.email,
      generatedPasswordHash,
      googleProfile.picture || null,
      googleProfile.googleSub,
      GOOGLE_AUTH_PROVIDER,
      googleProfile.emailVerified ? 1 : 0,
    ]
  );

  const [rows] = await db.execute(
    `SELECT ${getGoogleAuthSelectFields()} FROM users WHERE user_id = ? LIMIT 1`,
    [result.insertId]
  );

  return rows[0] || null;
};

export const verifyGoogleCredential = async (credential) => {
  if (!credential) {
    throw createGoogleAuthError({
      code: "GOOGLE_AUTH_CREDENTIAL_REQUIRED",
      message: "La credencial de Google es obligatoria.",
      status: 400,
    });
  }

  if (!isGoogleAuthConfigured()) {
    throw createGoogleAuthError({
      code: "GOOGLE_AUTH_NOT_CONFIGURED",
      message: "Google Sign-In no esta configurado.",
      status: 503,
      details: getMissingGoogleAuthEnvVars(),
    });
  }

  try {
    const client = getGoogleClient();
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: getConfiguredGoogleClientId(),
    });
    const payload = ticket.getPayload();

    if (!payload?.email) {
      throw createGoogleAuthError({
        code: "GOOGLE_AUTH_EMAIL_REQUIRED",
        message: "Google no devolvio un email valido.",
        status: 401,
      });
    }

    if (payload.email_verified !== true) {
      throw createGoogleAuthError({
        code: "GOOGLE_AUTH_EMAIL_NOT_VERIFIED",
        message: "La cuenta de Google no tiene un email verificado.",
        status: 403,
      });
    }

    return buildGoogleProfile(payload);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw createGoogleAuthError({
      code: "GOOGLE_AUTH_INVALID_TOKEN",
      message: "La credencial de Google no es valida.",
      status: 401,
      details: error?.message || null,
    });
  }
};

export const resolveGoogleAuthUser = async (db, googleProfile) => {
  const existingGoogleUser = await findUserByGoogleSub(db, googleProfile.googleSub);

  if (existingGoogleUser) {
    if (normalizeEmail(existingGoogleUser.email) !== googleProfile.email) {
      throw createGoogleAuthError({
        code: "GOOGLE_AUTH_ACCOUNT_CONFLICT",
        message: "La cuenta de Google ya esta vinculada a otro usuario.",
        status: 409,
      });
    }

    const updatedUser = await updateGoogleLinkedUser(
      db,
      existingGoogleUser,
      googleProfile
    );

    return {
      user: updatedUser,
      action: "existing_google_user",
    };
  }

  const existingEmailUser = await findUserByEmail(db, googleProfile.email);

  if (existingEmailUser) {
    if (
      existingEmailUser.google_sub &&
      existingEmailUser.google_sub !== googleProfile.googleSub
    ) {
      throw createGoogleAuthError({
        code: "GOOGLE_AUTH_ACCOUNT_CONFLICT",
        message: "El email ya esta vinculado a otra cuenta Google.",
        status: 409,
      });
    }

    const updatedUser = await updateGoogleLinkedUser(
      db,
      existingEmailUser,
      googleProfile
    );

    return {
      user: updatedUser,
      action: "linked_existing_user",
    };
  }

  const createdUser = await createGoogleUser(db, googleProfile);

  return {
    user: createdUser,
    action: "created_user",
  };
};

export const GOOGLE_AUTH_METADATA = {
  PROVIDER_LOCAL: DEFAULT_AUTH_PROVIDER,
  PROVIDER_GOOGLE: GOOGLE_AUTH_PROVIDER,
};
