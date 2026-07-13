import bcrypt from "bcryptjs";

import { generateAccessToken, generateRefreshToken } from "../utils/token.js";

const REFRESH_TOKEN_DURATION_DAYS = 7;

const buildAuthTokenPayload = (user) => {
  return {
    id: user.user_id,
    email: user.email,
    name: user.user_name,
  };
};

export const createAuthSession = async (db, user) => {
  const accessToken = generateAccessToken(buildAuthTokenPayload(user));
  const refreshToken = generateRefreshToken();
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  const expiresAt = new Date();

  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DURATION_DAYS);

  await db.execute(
    "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
    [user.user_id, hashedRefreshToken, expiresAt]
  );

  return {
    accessToken,
    refreshToken,
  };
};
