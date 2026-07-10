import { jest } from "@jest/globals";

import {
  getMailProvider,
  getMissingMailEnvVars,
  isMailConfigured,
  MAIL_PROVIDERS,
} from "../src/config/mail.js";
import { sendPasswordResetEmail } from "../src/service/emailService.js";

describe("email provider configuration", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.MAIL_PROVIDER;
    delete process.env.MAIL_HOST;
    delete process.env.MAIL_PORT;
    delete process.env.MAIL_SECURE;
    delete process.env.MAIL_USER;
    delete process.env.MAIL_PASSWORD;
    delete process.env.MAILTRAP_API_TOKEN;
    delete process.env.MAILTRAP_API_URL;
    delete process.env.MAIL_API_TIMEOUT_MS;
    process.env.MAIL_FROM = "noreply@example.com";
    process.env.MAIL_FROM_NAME = "Social App";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test("uses mailtrap api when MAIL_PROVIDER is mailtrap_api", () => {
    process.env.MAIL_PROVIDER = MAIL_PROVIDERS.MAILTRAP_API;
    process.env.MAILTRAP_API_TOKEN = "test-token";

    expect(getMailProvider()).toBe(MAIL_PROVIDERS.MAILTRAP_API);
    expect(isMailConfigured()).toBe(true);
  });

  test("requires only mailtrap api variables for the api provider", () => {
    process.env.MAIL_PROVIDER = MAIL_PROVIDERS.MAILTRAP_API;

    expect(getMissingMailEnvVars()).toEqual(["MAILTRAP_API_TOKEN"]);
  });

  test("sends password recovery email through mailtrap api", async () => {
    process.env.MAIL_PROVIDER = MAIL_PROVIDERS.MAILTRAP_API;
    process.env.MAILTRAP_API_TOKEN = "test-token";
    process.env.MAILTRAP_API_URL = "https://send.api.mailtrap.io/api/send";
    process.env.MAIL_API_TIMEOUT_MS = "15000";

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => "",
    });

    await sendPasswordResetEmail({
      to: "user@example.com",
      userName: "bryan",
      resetUrl: "https://frontend.example.com/reset-password?token=abc",
      expiresInMinutes: 30,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://send.api.mailtrap.io/api/send",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
      })
    );
  });
});
