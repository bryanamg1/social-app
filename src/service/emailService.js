import {
  getMailFromValue,
  getMailSenderIdentity,
  getMailProvider,
  getSmtpConfigSummary,
  getMailTransporter,
  getMailtrapApiConfig,
  getMissingMailEnvVars,
  isMailConfigured,
  MAIL_PROVIDERS,
} from "../config/mail.js";

const APP_NAME = "Social App";
const PASSWORD_RECOVERY_EMAIL_TIMEOUT_MESSAGE =
  "PASSWORD_RECOVERY_EMAIL_TIMEOUT";
const MAILTRAP_PROVIDER_ERROR_CODE = "MAIL_PROVIDER_REQUEST_FAILED";
const SMTP_PROVIDER_ERROR_CODE = "MAIL_PROVIDER_SMTP_FAILED";
const MAX_MAILTRAP_RESPONSE_LENGTH = 500;

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

const redactSensitiveValue = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  const mailPassword = process.env.MAIL_PASSWORD;
  const sanitizedValue =
    mailPassword && value.includes(mailPassword)
      ? value.replaceAll(mailPassword, "[redacted]")
      : value;

  if (sanitizedValue.length <= MAX_MAILTRAP_RESPONSE_LENGTH) {
    return sanitizedValue;
  }

  return `${sanitizedValue.slice(0, MAX_MAILTRAP_RESPONSE_LENGTH)}...`;
};

const sanitizeMailtrapResponse = (value, depth = 0) => {
  if (depth > 3) {
    return "[truncated]";
  }

  if (typeof value === "string") {
    return redactSensitiveValue(value);
  }

  if (Array.isArray(value)) {
    return value.slice(0, 10).map((entry) => sanitizeMailtrapResponse(entry, depth + 1));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.entries(value).reduce((sanitized, [key, entryValue]) => {
    const normalizedKey = key.toLowerCase();

    if (
      normalizedKey.includes("token") ||
      normalizedKey.includes("password") ||
      normalizedKey.includes("authorization")
    ) {
      sanitized[key] = "[redacted]";
      return sanitized;
    }

    sanitized[key] = sanitizeMailtrapResponse(entryValue, depth + 1);
    return sanitized;
  }, {});
};

const parseMailtrapResponseBody = (rawBody) => {
  if (!rawBody) {
    return null;
  }

  try {
    return sanitizeMailtrapResponse(JSON.parse(rawBody));
  } catch {
    return sanitizeMailtrapResponse(rawBody);
  }
};

const inferSmtpErrorStage = (error) => {
  const code = `${error?.code || ""}`.toUpperCase();
  const command = `${error?.command || ""}`.toUpperCase();
  const message = `${error?.message || ""}`.toLowerCase();

  if (code === "ETIMEDOUT" || message.includes("timeout")) {
    return "timeout";
  }

  if (code === "EAUTH" || command === "AUTH" || message.includes("auth")) {
    return "auth";
  }

  if (
    command === "CONN" ||
    code === "ECONNECTION" ||
    message.includes("connection refused") ||
    message.includes("socket closed")
  ) {
    return "connection";
  }

  if (
    message.includes("tls") ||
    message.includes("ssl") ||
    message.includes("handshake")
  ) {
    return "tls";
  }

  if (command === "MAIL FROM" || command === "RCPT TO" || command === "DATA") {
    return "send";
  }

  if (code === "ESOCKET") {
    return "socket";
  }

  return "unknown";
};

export const buildSmtpErrorDetails = (error, smtpConfigSummary = getSmtpConfigSummary()) => {
  return {
    ...smtpConfigSummary,
    code: error?.code || null,
    command: error?.command || null,
    responseCode: error?.responseCode || null,
    response: redactSensitiveValue(error?.response || null),
    reason: redactSensitiveValue(error?.reason || null),
    message: redactSensitiveValue(error?.message || null),
    stage: inferSmtpErrorStage(error),
  };
};

const buildMailtrapRequestPayload = ({
  to,
  userName,
  resetUrl,
  expiresInMinutes,
}) => {
  const sender = getMailSenderIdentity();
  const recipient = {
    email: to,
  };

  if (userName) {
    recipient.name = userName;
  }

  const from = {
    email: sender.from,
  };

  if (sender.fromName) {
    from.name = sender.fromName;
  }

  return {
    from,
    to: [recipient],
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
  };
};

const buildMailtrapProviderError = ({
  status,
  statusText,
  response,
}) => {
  const providerError = new Error(MAILTRAP_PROVIDER_ERROR_CODE);
  providerError.code = MAILTRAP_PROVIDER_ERROR_CODE;
  providerError.provider = MAIL_PROVIDERS.MAILTRAP_API;
  providerError.status = status;
  providerError.statusText = statusText || null;
  providerError.mailtrapResponse = response;
  providerError.details = {
    provider: MAIL_PROVIDERS.MAILTRAP_API,
    status,
    statusText: statusText || null,
    response,
  };

  return providerError;
};

const buildPasswordResetPayload = ({
  to,
  userName,
  resetUrl,
  expiresInMinutes,
}) => {
  return buildMailtrapRequestPayload({
    to,
    userName,
    resetUrl,
    expiresInMinutes,
  });
};

const sendPasswordResetEmailBySmtp = async ({
  to,
  userName,
  resetUrl,
  expiresInMinutes,
}) => {
  const transporter = getMailTransporter();
  const smtpConfigSummary = getSmtpConfigSummary();

  try {
    console.info("[mail-provider] sending password recovery email", {
      ...smtpConfigSummary,
      hasRecipient: Boolean(to),
    });

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
    const smtpErrorDetails = buildSmtpErrorDetails(error, smtpConfigSummary);
    const errorCode = error?.code || error?.responseCode || null;
    const rawMessage = `${error?.message || ""}`.toLowerCase();

    console.error("[mail-provider] SMTP request failed", smtpErrorDetails);

    if (errorCode === "ETIMEDOUT" || rawMessage.includes("timeout")) {
      const timeoutError = createTimeoutError();
      timeoutError.details = smtpErrorDetails;
      throw timeoutError;
    }

    error.code = error?.code || SMTP_PROVIDER_ERROR_CODE;
    error.details = smtpErrorDetails;
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
  const sender = getMailSenderIdentity();
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort(createTimeoutError());
  }, timeoutMs);

  try {
    console.info("[mail-provider] sending password recovery email", {
      provider: MAIL_PROVIDERS.MAILTRAP_API,
      hasApiToken: Boolean(apiToken),
      hasApiUrl: Boolean(apiUrl),
      hasFrom: Boolean(sender.from),
      fromDomain: sender.from?.split("@")[1] || null,
      hasRecipient: Boolean(to),
    });

    const payload = buildPasswordResetPayload({
      to,
      userName,
      resetUrl,
      expiresInMinutes,
    });
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });

    if (!response.ok) {
      const responseBody = parseMailtrapResponseBody(await response.text());

      console.error("[mail-provider] Mailtrap API request failed", {
        provider: MAIL_PROVIDERS.MAILTRAP_API,
        status: response.status,
        statusText: response.statusText,
        response: responseBody,
      });

      throw buildMailtrapProviderError({
        status: response.status,
        statusText: response.statusText,
        response: responseBody,
      });
    }
  } catch (error) {
    if (error?.name === "AbortError" || error?.code === "ETIMEDOUT") {
      throw createTimeoutError();
    }

    if (error?.code !== MAILTRAP_PROVIDER_ERROR_CODE) {
      console.error("[mail-provider] Mailtrap API request failed before response", {
        provider: MAIL_PROVIDERS.MAILTRAP_API,
        code: error?.code || null,
        message: error?.message || null,
      });
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
