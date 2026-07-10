import {
  getGmailApiConfig,
  getGmailApiConfigSummary,
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
const GMAIL_ACCESS_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_MESSAGE_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

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

  const secretValues = [
    process.env.MAIL_PASSWORD,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REFRESH_TOKEN,
    process.env.GMAIL_CLIENT_ID,
  ].filter(Boolean);

  const sanitizedValue = secretValues.reduce((currentValue, secretValue) => {
    if (!currentValue.includes(secretValue)) {
      return currentValue;
    }

    return currentValue.replaceAll(secretValue, "[redacted]");
  }, value);

  if (sanitizedValue.length <= MAX_MAILTRAP_RESPONSE_LENGTH) {
    return sanitizedValue;
  }

  return `${sanitizedValue.slice(0, MAX_MAILTRAP_RESPONSE_LENGTH)}...`;
};

const sanitizeProviderResponse = (value, depth = 0) => {
  if (depth > 3) {
    return "[truncated]";
  }

  if (typeof value === "string") {
    return redactSensitiveValue(value);
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 10)
      .map((entry) => sanitizeProviderResponse(entry, depth + 1));
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

    sanitized[key] = sanitizeProviderResponse(entryValue, depth + 1);
    return sanitized;
  }, {});
};

const parseProviderResponseBody = (rawBody) => {
  if (!rawBody) {
    return null;
  }

  try {
    return sanitizeProviderResponse(JSON.parse(rawBody));
  } catch {
    return sanitizeProviderResponse(rawBody);
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

const buildGmailApiRawRecipient = ({ email, name }) => {
  if (!name) {
    return email;
  }

  return `"${name}" <${email}>`;
};

export const buildGmailApiRawMessage = ({
  to,
  userName,
  resetUrl,
  expiresInMinutes,
}) => {
  const fromHeader = getMailFromValue();
  const toHeader = buildGmailApiRawRecipient({
    email: to,
    name: userName,
  });
  const boundary = `social-app-boundary-${Date.now()}`;

  return [
    `From: ${fromHeader}`,
    `To: ${toHeader}`,
    `Subject: ${APP_NAME}: recupera tu contrasena`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    buildPasswordResetText({
      userName,
      resetUrl,
      expiresInMinutes,
    }),
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    buildPasswordResetHtml({
      userName,
      resetUrl,
      expiresInMinutes,
    }).trim(),
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
};

export const encodeGmailApiRawMessage = (rawMessage) => {
  return Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
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

const buildHttpProviderError = ({
  provider,
  stage = null,
  status,
  statusText,
  response,
}) => {
  const providerError = new Error(MAILTRAP_PROVIDER_ERROR_CODE);
  providerError.code = MAILTRAP_PROVIDER_ERROR_CODE;
  providerError.provider = provider;
  providerError.stage = stage;
  providerError.status = status;
  providerError.statusText = statusText || null;
  providerError.providerResponse = response;
  if (provider === MAIL_PROVIDERS.MAILTRAP_API) {
    providerError.mailtrapResponse = response;
  }
  providerError.details = {
    provider,
    stage,
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
      const responseBody = parseProviderResponseBody(await response.text());

      console.error("[mail-provider] Mailtrap API request failed", {
        provider: MAIL_PROVIDERS.MAILTRAP_API,
        status: response.status,
        statusText: response.statusText,
        response: responseBody,
      });

      throw buildHttpProviderError({
        provider: MAIL_PROVIDERS.MAILTRAP_API,
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

const fetchWithTimeout = async ({
  url,
  options,
  timeoutMs,
}) => {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort(createTimeoutError());
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: abortController.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const requestGmailAccessToken = async (gmailApiConfig) => {
  const tokenBody = new URLSearchParams({
    client_id: gmailApiConfig.clientId,
    client_secret: gmailApiConfig.clientSecret,
    refresh_token: gmailApiConfig.refreshToken,
    grant_type: "refresh_token",
  });
  const response = await fetchWithTimeout({
    url: GMAIL_ACCESS_TOKEN_URL,
    options: {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenBody.toString(),
    },
    timeoutMs: gmailApiConfig.timeoutMs,
  });

  if (!response.ok) {
    const responseBody = parseProviderResponseBody(await response.text());

    console.error("[mail-provider] Gmail API request failed", {
      provider: MAIL_PROVIDERS.GMAIL_API,
      stage: "access_token",
      status: response.status,
      statusText: response.statusText,
      response: responseBody,
    });

    throw buildHttpProviderError({
      provider: MAIL_PROVIDERS.GMAIL_API,
      stage: "access_token",
      status: response.status,
      statusText: response.statusText,
      response: responseBody,
    });
  }

  const responseData = await response.json();

  return responseData.access_token || null;
};

const sendPasswordResetEmailByGmailApi = async ({
  to,
  userName,
  resetUrl,
  expiresInMinutes,
}) => {
  const gmailApiConfig = getGmailApiConfig();
  const gmailApiConfigSummary = getGmailApiConfigSummary();

  try {
    console.info("[mail-provider] sending password recovery email", {
      ...gmailApiConfigSummary,
      hasRecipient: Boolean(to),
    });

    const accessToken = await requestGmailAccessToken(gmailApiConfig);
    const rawMessage = encodeGmailApiRawMessage(
      buildGmailApiRawMessage({
        to,
        userName,
        resetUrl,
        expiresInMinutes,
      })
    );
    const response = await fetchWithTimeout({
      url: GMAIL_SEND_MESSAGE_URL,
      options: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          raw: rawMessage,
        }),
      },
      timeoutMs: gmailApiConfig.timeoutMs,
    });

    if (!response.ok) {
      const responseBody = parseProviderResponseBody(await response.text());

      console.error("[mail-provider] Gmail API request failed", {
        provider: MAIL_PROVIDERS.GMAIL_API,
        stage: "send_message",
        status: response.status,
        statusText: response.statusText,
        response: responseBody,
      });

      throw buildHttpProviderError({
        provider: MAIL_PROVIDERS.GMAIL_API,
        stage: "send_message",
        status: response.status,
        statusText: response.statusText,
        response: responseBody,
      });
    }
  } catch (error) {
    if (error?.name === "AbortError" || error?.code === "ETIMEDOUT") {
      throw createTimeoutError();
    }

    if (
      error?.code !== MAILTRAP_PROVIDER_ERROR_CODE &&
      error?.provider !== MAIL_PROVIDERS.GMAIL_API
    ) {
      console.error("[mail-provider] Gmail API request failed before response", {
        provider: MAIL_PROVIDERS.GMAIL_API,
        stage: error?.stage || "unknown",
        code: error?.code || null,
        message: redactSensitiveValue(error?.message || null),
      });
    }

    throw error;
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
  } else if (provider === MAIL_PROVIDERS.GMAIL_API) {
    await sendPasswordResetEmailByGmailApi({
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
