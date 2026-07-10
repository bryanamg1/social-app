import { jest } from "@jest/globals";

import {
  createPasswordRecoveryRequest,
  createPasswordResetToken,
  createPasswordResetUrl,
  deletePasswordResetTokenById,
  findPasswordRecoveryUserByEmail,
  getPasswordResetExpiresMinutes,
  hashPasswordResetToken,
} from "../src/service/passwordRecoveryService.js";

describe("password recovery helpers", () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;
  const originalExpiry = process.env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES;

  afterEach(() => {
    process.env.FRONTEND_URL = originalFrontendUrl;
    process.env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES = originalExpiry;
  });

  test("creates a deterministic hash for the same token", () => {
    const token = "sample-token";

    expect(hashPasswordResetToken(token)).toBe(
      hashPasswordResetToken(token)
    );
  });

  test("builds the reset url using the frontend base url", () => {
    process.env.FRONTEND_URL = "https://frontend.example.com";

    const resetUrl = createPasswordResetUrl("token-value");
    const parsedUrl = new URL(resetUrl);

    expect(parsedUrl.origin).toBe("https://frontend.example.com");
    expect(parsedUrl.pathname).toBe("/reset-password");
    expect(parsedUrl.searchParams.get("token")).toBe("token-value");
  });

  test("returns the configured expiration minutes", () => {
    process.env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES = "45";

    expect(getPasswordResetExpiresMinutes()).toBe(45);
  });

  test("creates a plain token and its hash", () => {
    const { plainToken, tokenHash } = createPasswordResetToken();

    expect(typeof plainToken).toBe("string");
    expect(plainToken).not.toHaveLength(0);
    expect(tokenHash).toBe(hashPasswordResetToken(plainToken));
  });

  test("finds the password recovery user using a normalized email", async () => {
    const execute = jest.fn().mockResolvedValue([
      [{ user_id: 14, user_name: "bryan_amg1", email: "bryan_amg1@icloud.com" }],
    ]);

    const user = await findPasswordRecoveryUserByEmail(
      { execute },
      "  BRYAN_AMG1@ICLOUD.COM  "
    );

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("FROM users"),
      ["bryan_amg1@icloud.com"]
    );
    expect(user).toEqual({
      user_id: 14,
      user_name: "bryan_amg1",
      email: "bryan_amg1@icloud.com",
    });
  });

  test("creates the recovery request and returns token metadata", async () => {
    process.env.FRONTEND_URL = "https://frontend.example.com";

    const execute = jest
      .fn()
      .mockResolvedValueOnce([
        [{ user_id: 14, user_name: "bryan_amg1", email: "bryan_amg1@icloud.com" }],
      ])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{ insertId: 9 }]);

    const recoveryRequest = await createPasswordRecoveryRequest(
      { execute },
      "bryan_amg1@icloud.com"
    );

    expect(recoveryRequest).toEqual(
      expect.objectContaining({
        resetTokenId: 9,
        user: {
          user_id: 14,
          user_name: "bryan_amg1",
          email: "bryan_amg1@icloud.com",
        },
        expiresInMinutes: expect.any(Number),
      })
    );
    expect(recoveryRequest.resetUrl).toContain("/reset-password?token=");
  });

  test("deletes the token if email delivery cleanup is needed", async () => {
    const execute = jest.fn().mockResolvedValue([{}]);

    await deletePasswordResetTokenById({ execute }, 11);

    expect(execute).toHaveBeenCalledWith(
      "DELETE FROM password_reset_tokens WHERE id = ?",
      [11]
    );
  });
});
