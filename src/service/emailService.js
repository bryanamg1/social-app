import {
  getMailFromValue,
  getMailSenderIdentity,
  getMailProvider,
  getMailTransporter,
  getMailtrapApiConfig,
  getMissingMailEnvVars,
  isMailConfigured,
  MAIL_PROVIDERS,
} from "../config/mail.js";

const APP_NAME = "Social App";
const PASSWORD_RECOVERY_EMAIL_TIMEOUT_MESSAGE =
  "PASSWORD_RECOVERY_EMAIL_TIMEOUT";

const buildPasswordResetText = ({ userName, resetUrl, expiresInMinutes }) => {
  const greeting = userName ? `Hola ${userName},` : "Hola,";

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
  const greeting = userName ? `Hola ${userName},` : "Hola,";

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

const createTimeoutError = () => {
  const timeoutError = new Error(PASSWORD_RECOVERY_EMAIL_TIMEOUT_MESSAGE);
  timeoutError.code = "ETIMEDOUT";
  return timeoutError;
};

const buildPasswordResetPayload = ({
  to,
  userName,
  resetUrl,
  expiresInMinutes,
}) => {
  const sender = getMailSenderIdentity();

  return {
    from: {
      email: sender.from,
      name: sender.fromName || undefined,
    },
    to: [
      {
        email: to,
        name: userName || undefined,
      },
    ],
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
    category: "password-recovery",
  };
};

const sendPasswordResetEmailBySmtp = async ({
  to,
  userName,
  resetUrl,
  expiresInMinutes,
}) => {
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
      throw createTimeoutError();
    }

    throw error;
  }
};

const sendPasswordResetEmailByMailtrapApi = async ({
  to,
  userName,
  resetUrl,
  expiresInMinutes,
}) => {
  const { apiToken, apiUrl, timeoutMs } = getMailtrapApiConfig();
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort(createTimeoutError());
  }, timeoutMs);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        buildPasswordResetPayload({
          to,
          userName,
          resetUrl,
          expiresInMinutes,
        })
      ),
      signal: abortController.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const providerError = new Error("MAIL_PROVIDER_REQUEST_FAILED");
      providerError.code = "MAIL_PROVIDER_REQUEST_FAILED";
      providerError.status = response.status;
      providerError.details = errorBody.slice(0, 300);
      throw providerError;
    }
  } catch (error) {
    if (error?.name === "AbortError" || error?.code === "ETIMEDOUT") {
      throw createTimeoutError();
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
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

  const provider = getMailProvider();

  if (provider === MAIL_PROVIDERS.MAILTRAP_API) {
    await sendPasswordResetEmailByMailtrapApi({
      to,
      userName,
      resetUrl,
      expiresInMinutes,
    });
  } else {
    await sendPasswordResetEmailBySmtp({
      to,
      userName,
      resetUrl,
      expiresInMinutes,
    });
  }

  return {
    delivered: true,
  };
};
