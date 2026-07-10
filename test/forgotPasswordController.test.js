import { jest } from "@jest/globals";

const getDB = jest.fn();
const getMissingMailEnvVars = jest.fn();
const isMailConfigured = jest.fn();
const sendPasswordResetEmail = jest.fn();
const createPasswordRecoveryRequest = jest.fn();
const deletePasswordResetTokenById = jest.fn();
const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.unstable_mockModule("../src/config/db.js", () => ({
  getDB,
}));

jest.unstable_mockModule("../src/config/mail.js", () => ({
  getMissingMailEnvVars,
  isMailConfigured,
}));

jest.unstable_mockModule("../src/service/emailService.js", () => ({
  sendPasswordResetEmail,
}));

jest.unstable_mockModule("../src/config/logger.js", () => ({
  logger,
}));

jest.unstable_mockModule("../src/service/passwordRecoveryService.js", () => ({
  clearUserRefreshTokens: jest.fn(),
  createPasswordRecoveryRequest,
  deletePasswordResetTokenById,
  findPasswordResetRecordByToken: jest.fn(),
  invalidateActivePasswordResetTokens: jest.fn(),
  isPasswordResetRecordExpired: jest.fn(),
  markPasswordResetTokenUsed: jest.fn(),
  PASSWORD_RESET_INVALID_TOKEN_MESSAGE: "Token invalido o expirado.",
  PASSWORD_RESET_PUBLIC_MESSAGE:
    "Si el email existe, enviaremos un enlace para restablecer la contrasena.",
  PASSWORD_RESET_SERVICE_UNAVAILABLE_MESSAGE:
    "El servicio de recuperacion no esta disponible en este momento.",
  PASSWORD_RESET_SUCCESS_MESSAGE: "Contrasena actualizada correctamente.",
}));

const { forgotPassword } = await import("../src/controllers/userController.js");
const { AppError } = await import("../src/utils/utils.js");

describe("forgotPassword controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isMailConfigured.mockReturnValue(true);
    getMissingMailEnvVars.mockReturnValue([]);
  });

  test("deletes the reset token and returns a generic app error when smtp delivery fails", async () => {
    const db = {
      query: jest.fn(),
      execute: jest.fn(),
    };
    const smtpDetails = {
      provider: "smtp",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      code: "ESOCKET",
      stage: "socket",
    };
    const req = {
      body: {
        email: "USER@example.com",
      },
      requestId: "req-1",
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    getDB.mockReturnValue(db);
    createPasswordRecoveryRequest.mockResolvedValue({
      user: {
        user_id: 5,
        user_name: "bryan",
        email: "user@example.com",
      },
      resetTokenId: 12,
      resetUrl: "https://frontend.example.com/reset-password?token=secret",
      expiresInMinutes: 30,
    });
    sendPasswordResetEmail.mockRejectedValue(
      Object.assign(new Error("socket hang up"), {
        code: "ESOCKET",
        details: smtpDetails,
      })
    );

    await forgotPassword(req, res, next);

    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
      })
    );
    expect(deletePasswordResetTokenById).toHaveBeenCalledWith(db, 12);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
    expect(next.mock.calls[0][0]).toMatchObject({
      code: "FORGOT_PASSWORD_EMAIL_FAILED",
      message: "No se pudo enviar el email de recuperacion",
      status: 500,
      details: smtpDetails,
    });
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
