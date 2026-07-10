import {
  getMailFromValue,
  getMailTransporter,
  getMissingMailEnvVars,
  isMailConfigured,
} from "../config/mail.js";

const APP_NAME = "Social App";
const PASSWORD_RECOVERY_EMAIL_TIMEOUT_MESSAGE =
  "PASSWORD_RECOVERY_EMAIL_TIMEOUT";

const buildPasswordResetText = ({ userName, resetUrl, expiresInMinutes }) => {
  const greeting = userName
    ? `Hola ${userName},`
    : "Hola,";

  return [
    greeting,
    "",
    "Recibimos una solicitud para restablecer tu contrasena.",
    `Usa este enlace dentro de los proximos ${expiresInMinutes} minutos:`,
    resetUrl,
    "",
    "Si no solicitaste este cambio, puedes ignorar este email.",
  ].join("\n");
};

const buildPasswordResetHtml = ({ userName, resetUrl, expiresInMinutes }) => {
  const greeting = userName
    ? `Hola ${userName},`
    : "Hola,";

  return `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <h2 style="margin-bottom: 16px;">${APP_NAME}</h2>
      <p>${greeting}</p>
      <p>Recibimos una solicitud para restablecer tu contrasena.</p>
      <p>Este enlace estara disponible durante ${expiresInMinutes} minutos.</p>
      <p>
        <a
          href="${resetUrl}"
          style="display: inline-block; padding: 12px 18px; background: #38bdf8; color: #06111f; text-decoration: none; border-radius: 999px; font-weight: 700;"
        >
          Restablecer contrasena
        </a>
      </p>
      <p>Si no solicitaste este cambio, puedes ignorar este email.</p>
    </div>
  `;
};

export const sendPasswordResetEmail = async ({
  to,
  userName,
  resetUrl,
  expiresInMinutes,
}) => {
  if (!isMailConfigured()) {
    return {
      delivered: false,
      missingEnvVars: getMissingMailEnvVars(),
    };
  }

  const transporter = getMailTransporter();

  try {
    await transporter.sendMail({
      from: getMailFromValue(),
      to,
      subject: `${APP_NAME}: recupera tu contrasena`,
      text: buildPasswordResetText({
        userName,
        resetUrl,
        expiresInMinutes,
      }),
      html: buildPasswordResetHtml({
        userName,
        resetUrl,
        expiresInMinutes,
      }),
    });
  } catch (error) {
    const errorCode = error?.code || error?.responseCode || null;
    const rawMessage = `${error?.message || ""}`.toLowerCase();

    if (errorCode === "ETIMEDOUT" || rawMessage.includes("timeout")) {
      const timeoutError = new Error(PASSWORD_RECOVERY_EMAIL_TIMEOUT_MESSAGE);
      timeoutError.code = "ETIMEDOUT";
      throw timeoutError;
    }

    throw error;
  }

  return {
    delivered: true,
  };
};
