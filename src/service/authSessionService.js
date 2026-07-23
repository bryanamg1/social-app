import { generateAccessToken } from "../utils/token.js";

const buildAuthTokenPayload = (user) => {
  return {
    id: user.user_id,
    email: user.email,
    name: user.user_name,
  };
};

export const createAuthSession = async (_db, user) => {
  const accessToken = generateAccessToken(buildAuthTokenPayload(user));

  return {
    accessToken,
  };
};
