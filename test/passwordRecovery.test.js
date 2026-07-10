import {
  createPasswordResetToken,
  createPasswordResetUrl,
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
});
