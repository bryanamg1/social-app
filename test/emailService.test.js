import { jest } from "@jest/globals";

import {
  getGmailApiConfigSummary,
  getMailProvider,
  getMissingMailEnvVars,
  getSmtpConfigSummary,
  getSmtpTransportOptions,
  isMailConfigured,
  MAIL_PROVIDERS,
} from "../src/config/mail.js";
import {
  buildGmailApiRawMessage,
  buildSmtpErrorDetails,
  encodeGmailApiRawMessage,
  sendPasswordResetEmail,
} from "../src/service/emailService.js";

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
    delete process.env.GMAIL_CLIENT_ID;
    delete process.env.GMAIL_CLIENT_SECRET;
    delete process.env.GMAIL_REFRESH_TOKEN;
    delete process.env.GMAIL_USER;
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

  test("uses gmail api when MAIL_PROVIDER is gmail_api", () => {
    process.env.MAIL_PROVIDER = MAIL_PROVIDERS.GMAIL_API;
    process.env.GMAIL_CLIENT_ID = "client-id";
    process.env.GMAIL_CLIENT_SECRET = "client-secret";
    process.env.GMAIL_REFRESH_TOKEN = "refresh-token";
    process.env.GMAIL_USER = "socialapp.soporte@gmail.com";

    expect(getMailProvider()).toBe(MAIL_PROVIDERS.GMAIL_API);
    expect(isMailConfigured()).toBe(true);
    expect(getGmailApiConfigSummary()).toEqual(
      expect.objectContaining({
        provider: MAIL_PROVIDERS.GMAIL_API,
        hasClientId: true,
        hasClientSecret: true,
        hasRefreshToken: true,
        hasUser: true,
        user: "socialapp.soporte@gmail.com",
        fromDomain: "example.com",
      })
    );
  });

  test("requires only mailtrap api variables for the api provider", () => {
    process.env.MAIL_PROVIDER = MAIL_PROVIDERS.MAILTRAP_API;

    expect(getMissingMailEnvVars()).toEqual(["MAILTRAP_API_TOKEN"]);
  });

  test("requires only gmail api variables for the gmail api provider", () => {
    process.env.MAIL_PROVIDER = MAIL_PROVIDERS.GMAIL_API;

    expect(getMissingMailEnvVars()).toEqual([
      "GMAIL_CLIENT_ID",
      "GMAIL_CLIENT_SECRET",
      "GMAIL_REFRESH_TOKEN",
      "GMAIL_USER",
    ]);
  });

  test("builds smtp config using numeric port and boolean secure", () => {
    process.env.MAIL_PROVIDER = MAIL_PROVIDERS.SMTP;
    process.env.MAIL_HOST = "smtp.gmail.com";
    process.env.MAIL_PORT = "465";
    process.env.MAIL_SECURE = "true";
    process.env.MAIL_USER = "socialapp.soporte@gmail.com";
    process.env.MAIL_PASSWORD = "app-password";

    expect(getMailProvider()).toBe(MAIL_PROVIDERS.SMTP);
    expect(getSmtpConfigSummary()).toEqual(
      expect.objectContaining({
        provider: MAIL_PROVIDERS.SMTP,
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        requireTLS: false,
        hasUser: true,
        hasPassword: true,
        fromDomain: "example.com",
      })
    );
  });

  test("enables requireTLS for gmail on port 587", () => {
    process.env.MAIL_PROVIDER = MAIL_PROVIDERS.SMTP;
    process.env.MAIL_HOST = "smtp.gmail.com";
    process.env.MAIL_PORT = "587";
    process.env.MAIL_SECURE = "false";
    process.env.MAIL_USER = "socialapp.soporte@gmail.com";
    process.env.MAIL_PASSWORD = "app-password";

    expect(getSmtpTransportOptions()).toEqual(
      expect.objectContaining({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        requireTLS: true,
        tls: {
          servername: "smtp.gmail.com",
        },
      })
    );
  });

  test("sanitizes smtp diagnostics without exposing credentials", () => {
    process.env.MAIL_PROVIDER = MAIL_PROVIDERS.SMTP;
    process.env.MAIL_HOST = "smtp.gmail.com";
    process.env.MAIL_PORT = "465";
    process.env.MAIL_SECURE = "true";
    process.env.MAIL_USER = "socialapp.soporte@gmail.com";
    process.env.MAIL_PASSWORD = "super-secret-app-password";

    const smtpErrorDetails = buildSmtpErrorDetails({
      code: "ESOCKET",
      command: "CONN",
      responseCode: 535,
      response: "535 Invalid credentials super-secret-app-password",
      reason: "Authentication failed super-secret-app-password",
      message: "socket hang up super-secret-app-password",
    });

    expect(smtpErrorDetails).toEqual(
      expect.objectContaining({
        provider: MAIL_PROVIDERS.SMTP,
        code: "ESOCKET",
        command: "CONN",
        responseCode: 535,
        stage: "connection",
      })
    );
    expect(JSON.stringify(smtpErrorDetails)).not.toContain(
      "super-secret-app-password"
    );
    expect(smtpErrorDetails.response).toContain("[redacted]");
    expect(smtpErrorDetails.reason).toContain("[redacted]");
    expect(smtpErrorDetails.message).toContain("[redacted]");
  });

  test("builds a gmail api raw mime message and encodes it as base64url", () => {
    const rawMessage = buildGmailApiRawMessage({
      to: "user@example.com",
      userName: "bryan",
      resetUrl: "https://frontend.example.com/reset-password?token=abc",
      expiresInMinutes: 30,
    });
    const encodedRawMessage = encodeGmailApiRawMessage(rawMessage);
    const decodedRawMessage = Buffer.from(
      encodedRawMessage.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf-8");

    expect(rawMessage).toContain('From: "Social App" <noreply@example.com>');
    expect(rawMessage).toContain('To: "bryan" <user@example.com>');
    expect(rawMessage).toContain("Subject: Social App: recupera tu contrasena");
    expect(rawMessage).toContain("Content-Type: multipart/alternative;");
    expect(rawMessage).toContain("Content-Type: text/plain; charset=\"UTF-8\"");
    expect(rawMessage).toContain("Content-Type: text/html; charset=\"UTF-8\"");
    expect(decodedRawMessage).toBe(rawMessage);
    expect(encodedRawMessage).not.toContain("=");
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

  test("sends password recovery email through gmail api using refresh token and bearer token", async () => {
    process.env.MAIL_PROVIDER = MAIL_PROVIDERS.GMAIL_API;
    process.env.GMAIL_CLIENT_ID = "client-id";
    process.env.GMAIL_CLIENT_SECRET = "client-secret";
    process.env.GMAIL_REFRESH_TOKEN = "refresh-token";
    process.env.GMAIL_USER = "socialapp.soporte@gmail.com";
    process.env.MAIL_API_TIMEOUT_MS = "15000";

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "access-token",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "gmail-message-id",
        }),
      });

    await sendPasswordResetEmail({
      to: "user@example.com",
      userName: "bryan",
      resetUrl: "https://frontend.example.com/reset-password?token=abc",
      expiresInMinutes: 30,
    });

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })
    );
    const [, tokenRequestConfig] = global.fetch.mock.calls[0];
    expect(tokenRequestConfig.body).toContain("grant_type=refresh_token");
    expect(tokenRequestConfig.body).toContain("refresh_token=refresh-token");
    expect(tokenRequestConfig.body).toContain("client_id=client-id");

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        }),
      })
    );
    const [, sendRequestConfig] = global.fetch.mock.calls[1];
    expect(JSON.parse(sendRequestConfig.body)).toEqual({
      raw: expect.any(String),
    });
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "[mail-provider] sending password recovery email",
      expect.objectContaining({
        provider: MAIL_PROVIDERS.GMAIL_API,
        hasClientId: true,
        hasClientSecret: true,
        hasRefreshToken: true,
        hasUser: true,
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

  test("sanitizes gmail api diagnostics when the send request fails", async () => {
    process.env.MAIL_PROVIDER = MAIL_PROVIDERS.GMAIL_API;
    process.env.GMAIL_CLIENT_ID = "client-id";
    process.env.GMAIL_CLIENT_SECRET = "client-secret";
    process.env.GMAIL_REFRESH_TOKEN = "refresh-token";
    process.env.GMAIL_USER = "socialapp.soporte@gmail.com";

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "access-token",
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: async () =>
          JSON.stringify({
            error: {
              message: "Request rejected",
              refresh_token: "refresh-token",
              access_token: "access-token",
            },
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
      provider: MAIL_PROVIDERS.GMAIL_API,
      stage: "send_message",
      status: 403,
      statusText: "Forbidden",
      details: {
        provider: MAIL_PROVIDERS.GMAIL_API,
        stage: "send_message",
        status: 403,
        response: {
          error: {
            message: "Request rejected",
            refresh_token: "[redacted]",
            access_token: "[redacted]",
          },
        },
      },
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[mail-provider] Gmail API request failed",
      expect.objectContaining({
        provider: MAIL_PROVIDERS.GMAIL_API,
        stage: "send_message",
        status: 403,
        statusText: "Forbidden",
        response: {
          error: {
            message: "Request rejected",
            refresh_token: "[redacted]",
            access_token: "[redacted]",
          },
        },
      })
    );
  });
});
