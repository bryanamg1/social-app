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
  let consoleInfoSpy;
  let consoleErrorSpy;

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
    consoleInfoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
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
    const [, requestConfig] = global.fetch.mock.calls[0];
    const payload = JSON.parse(requestConfig.body);

    expect(payload).toEqual(
      expect.objectContaining({
        from: {
          email: "noreply@example.com",
          name: "Social App",
        },
        to: [
          {
            email: "user@example.com",
            name: "bryan",
          },
        ],
        subject: "Social App: recupera tu contrasena",
        text: expect.any(String),
        html: expect.any(String),
      })
    );
    expect(payload.category).toBeUndefined();
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "[mail-provider] sending password recovery email",
      expect.objectContaining({
        provider: MAIL_PROVIDERS.MAILTRAP_API,
        hasApiToken: true,
        hasApiUrl: true,
        hasFrom: true,
        fromDomain: "example.com",
        hasRecipient: true,
      })
    );
  });

  test("surfaces safe mailtrap diagnostics when the api request fails", async () => {
    process.env.MAIL_PROVIDER = MAIL_PROVIDERS.MAILTRAP_API;
    process.env.MAILTRAP_API_TOKEN = "test-token";
    process.env.MAILTRAP_API_URL = "https://send.api.mailtrap.io/api/send";

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () =>
        JSON.stringify({
          message: "Invalid API token",
          errors: [
            {
              field: "authorization",
              message: "Bearer token rejected",
            },
          ],
        }),
    });

    await expect(
      sendPasswordResetEmail({
        to: "user@example.com",
        userName: "bryan",
        resetUrl: "https://frontend.example.com/reset-password?token=abc",
        expiresInMinutes: 30,
      })
    ).rejects.toMatchObject({
      code: "MAIL_PROVIDER_REQUEST_FAILED",
      provider: MAIL_PROVIDERS.MAILTRAP_API,
      status: 401,
      statusText: "Unauthorized",
      mailtrapResponse: {
        message: "Invalid API token",
        errors: [
          {
            field: "authorization",
            message: "Bearer token rejected",
          },
        ],
      },
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[mail-provider] Mailtrap API request failed",
      expect.objectContaining({
        provider: MAIL_PROVIDERS.MAILTRAP_API,
        status: 401,
        statusText: "Unauthorized",
        response: {
          message: "Invalid API token",
          errors: [
            {
              field: "authorization",
              message: "Bearer token rejected",
            },
          ],
        },
      })
    );
  });
});
