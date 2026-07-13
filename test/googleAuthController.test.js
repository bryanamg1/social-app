import { jest } from "@jest/globals";

const getDB = jest.fn();
const createAuthSession = jest.fn();
const getMissingGoogleAuthEnvVars = jest.fn();
const isGoogleAuthConfigured = jest.fn();
const resolveGoogleAuthUser = jest.fn();
const verifyGoogleCredential = jest.fn();
const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.unstable_mockModule("../src/config/db.js", () => ({
  getDB,
}));

jest.unstable_mockModule("../src/service/authSessionService.js", () => ({
  createAuthSession,
}));

jest.unstable_mockModule("../src/service/googleAuthService.js", () => ({
  getMissingGoogleAuthEnvVars,
  isGoogleAuthConfigured,
  resolveGoogleAuthUser,
  verifyGoogleCredential,
}));

jest.unstable_mockModule("../src/config/logger.js", () => ({
  logger,
}));

const actualMailModule = await import("../src/config/mail.js");
const actualEmailModule = await import("../src/service/emailService.js");
const actualPasswordRecoveryModule = await import(
  "../src/service/passwordRecoveryService.js"
);

jest.unstable_mockModule("../src/config/mail.js", () => actualMailModule);
jest.unstable_mockModule("../src/service/emailService.js", () => actualEmailModule);
jest.unstable_mockModule("../src/service/passwordRecoveryService.js", () => actualPasswordRecoveryModule);

const { googleAuth } = await import("../src/controllers/userController.js");
const { AppError } = await import("../src/utils/utils.js");

describe("googleAuth controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isGoogleAuthConfigured.mockReturnValue(true);
    getMissingGoogleAuthEnvVars.mockReturnValue([]);
    getDB.mockReturnValue({
      execute: jest.fn(),
      query: jest.fn(),
    });
  });

  test("rejects a missing google credential", async () => {
    const req = {
      body: {},
      requestId: "req-google-1",
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await googleAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
    expect(next.mock.calls[0][0]).toMatchObject({
      code: "GOOGLE_AUTH_CREDENTIAL_REQUIRED",
      status: 400,
    });
    expect(res.status).not.toHaveBeenCalled();
  });

  test("rejects an invalid google token", async () => {
    const req = {
      body: {
        credential: "invalid-google-id-token",
      },
      requestId: "req-google-2",
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    verifyGoogleCredential.mockRejectedValue(
      new AppError({
        code: "GOOGLE_AUTH_INVALID_TOKEN",
        message: "La credencial de Google no es valida.",
        status: 401,
      })
    );

    await googleAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toMatchObject({
      code: "GOOGLE_AUTH_INVALID_TOKEN",
      status: 401,
    });
  });

  test("returns a compatible auth payload for a verified google user", async () => {
    const req = {
      body: {
        credential: "valid-google-id-token",
      },
      requestId: "req-google-3",
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    verifyGoogleCredential.mockResolvedValue({
      googleSub: "google-sub",
      email: "user@example.com",
      emailVerified: true,
      name: "Bryan Marquez",
      givenName: "Bryan",
      picture: "https://images.example.com/avatar.png",
    });
    resolveGoogleAuthUser.mockResolvedValue({
      action: "created_user",
      user: {
        user_id: 7,
        user_name: "bryan_marquez",
        email: "user@example.com",
      },
    });
    createAuthSession.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });

    await googleAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Login exitoso",
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
