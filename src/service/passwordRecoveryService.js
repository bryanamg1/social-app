import crypto from "crypto";

const DEFAULT_RESET_TOKEN_EXPIRES_MINUTES = 30;
const DEFAULT_FRONTEND_URL = "http://localhost:5173";
const RESET_PASSWORD_PATH = "/reset-password";

const toPositiveInteger = (value, fallback) => {
  const parsedValue = Number.parseInt(value || `${fallback}`, 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
};

const normalizeBaseUrl = (baseUrl) => {
  if (baseUrl.endsWith("/")) {
    return baseUrl;
  }

  return `${baseUrl}/`;
};

export const PASSWORD_RESET_PUBLIC_MESSAGE =
  "Si el email existe, enviaremos instrucciones para recuperar tu contrasena.";

export const PASSWORD_RESET_SUCCESS_MESSAGE =
  "Contrasena actualizada correctamente.";

export const PASSWORD_RESET_INVALID_TOKEN_MESSAGE =
  "El enlace de recuperacion no es valido o ya expiro.";

export const PASSWORD_RESET_SERVICE_UNAVAILABLE_MESSAGE =
  "El servicio de recuperacion no esta disponible en este momento.";

export const getPasswordResetExpiresMinutes = () => {
  return toPositiveInteger(
    process.env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES,
    DEFAULT_RESET_TOKEN_EXPIRES_MINUTES
  );
};

export const createPasswordResetToken = () => {
  const plainToken = crypto.randomBytes(32).toString("hex");

  return {
    plainToken,
    tokenHash: hashPasswordResetToken(plainToken),
  };
};

export const hashPasswordResetToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(`${token}`)
    .digest("hex");
};

export const createPasswordResetExpiry = () => {
  const expiresAt = new Date();

  expiresAt.setMinutes(
    expiresAt.getMinutes() + getPasswordResetExpiresMinutes()
  );

  return expiresAt;
};

export const createPasswordResetUrl = (token) => {
  const baseUrl = normalizeBaseUrl(
    process.env.FRONTEND_URL?.trim() || DEFAULT_FRONTEND_URL
  );
  const resetUrl = new URL(RESET_PASSWORD_PATH, baseUrl);

  resetUrl.searchParams.set("token", token);

  return resetUrl.toString();
};

export const invalidateActivePasswordResetTokens = async (db, userId) => {
  await db.execute(
    `
      UPDATE password_reset_tokens
      SET used_at = NOW()
      WHERE user_id = ?
        AND used_at IS NULL
    `,
    [userId]
  );
};

export const storePasswordResetToken = async (
  db,
  { userId, tokenHash, expiresAt }
) => {
  await invalidateActivePasswordResetTokens(db, userId);

  const [result] = await db.execute(
    `
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `,
    [userId, tokenHash, expiresAt]
  );

  return result.insertId;
};

export const findPasswordResetRecordByToken = async (db, token) => {
  const [rows] = await db.execute(
    `
      SELECT
        prt.id,
        prt.user_id,
        prt.expires_at,
        prt.used_at,
        u.email,
        u.user_name
      FROM password_reset_tokens prt
      INNER JOIN users u ON u.user_id = prt.user_id
      WHERE prt.token_hash = ?
      LIMIT 1
    `,
    [hashPasswordResetToken(token)]
  );

  return rows[0] || null;
};

export const isPasswordResetRecordExpired = (resetRecord) => {
  if (!resetRecord) {
    return true;
  }

  if (resetRecord.used_at) {
    return true;
  }

  return new Date(resetRecord.expires_at).getTime() <= Date.now();
};

export const markPasswordResetTokenUsed = async (db, resetTokenId) => {
  await db.execute(
    `
      UPDATE password_reset_tokens
      SET used_at = NOW()
      WHERE id = ?
        AND used_at IS NULL
    `,
    [resetTokenId]
  );
};

export const clearUserRefreshTokens = async (db, userId) => {
  await db.execute("DELETE FROM refresh_tokens WHERE user_id = ?", [userId]);
};
