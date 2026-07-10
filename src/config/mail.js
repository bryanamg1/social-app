import nodemailer from "nodemailer";

export const MAIL_PROVIDERS = {
  SMTP: "smtp",
  MAILTRAP_API: "mailtrap_api",
  GMAIL_API: "gmail_api",
};

const DEFAULT_MAIL_PORT = 587;
const DEFAULT_CONNECTION_TIMEOUT_MS = 10000;
const DEFAULT_GREETING_TIMEOUT_MS = 10000;
const DEFAULT_SOCKET_TIMEOUT_MS = 15000;
const DEFAULT_API_TIMEOUT_MS = 15000;
const DEFAULT_MAILTRAP_API_URL = "https://send.api.mailtrap.io/api/send";
const GMAIL_SMTP_HOST = "smtp.gmail.com";

const toBoolean = (value, fallback = false) => {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim().toLowerCase() === "true";
};

const toPort = (value) => {
  const parsedPort = Number.parseInt(value || `${DEFAULT_MAIL_PORT}`, 10);

  if (!Number.isFinite(parsedPort)) {
    return DEFAULT_MAIL_PORT;
  }

  return parsedPort;
};

const toTimeout = (value, fallback) => {
  const parsedTimeout = Number.parseInt(value || `${fallback}`, 10);

  if (!Number.isFinite(parsedTimeout) || parsedTimeout <= 0) {
    return fallback;
  }

  return parsedTimeout;
};

const getExplicitProvider = () => {
  const provider = process.env.MAIL_PROVIDER?.trim().toLowerCase();

  if (provider === MAIL_PROVIDERS.MAILTRAP_API) {
    return MAIL_PROVIDERS.MAILTRAP_API;
  }

  if (provider === MAIL_PROVIDERS.GMAIL_API) {
    return MAIL_PROVIDERS.GMAIL_API;
  }

  if (provider === MAIL_PROVIDERS.SMTP) {
    return MAIL_PROVIDERS.SMTP;
  }

  return null;
};

export const getMailProvider = () => {
  const explicitProvider = getExplicitProvider();

  if (explicitProvider) {
    return explicitProvider;
  }

  const hasSmtpCredentials = Boolean(
    process.env.MAIL_HOST?.trim() &&
      process.env.MAIL_USER?.trim() &&
      process.env.MAIL_PASSWORD
  );

  if (hasSmtpCredentials) {
    return MAIL_PROVIDERS.SMTP;
  }

  if (process.env.MAILTRAP_API_TOKEN?.trim()) {
    return MAIL_PROVIDERS.MAILTRAP_API;
  }

  const hasGmailApiCredentials = Boolean(
    process.env.GMAIL_CLIENT_ID?.trim() &&
      process.env.GMAIL_CLIENT_SECRET?.trim() &&
      process.env.GMAIL_REFRESH_TOKEN?.trim() &&
      process.env.GMAIL_USER?.trim()
  );

  if (hasGmailApiCredentials) {
    return MAIL_PROVIDERS.GMAIL_API;
  }

  return MAIL_PROVIDERS.SMTP;
};

const getCommonMailEnv = () => {
  return {
    from: process.env.MAIL_FROM?.trim() || "",
    fromName: process.env.MAIL_FROM_NAME?.trim() || "",
  };
};

const getSmtpEnv = () => {
  const port = toPort(process.env.MAIL_PORT);
  const secure =
    typeof process.env.MAIL_SECURE === "string"
      ? toBoolean(process.env.MAIL_SECURE)
      : port === 465;

  return {
    ...getCommonMailEnv(),
    host: process.env.MAIL_HOST?.trim() || "",
    port,
    secure,
    user: process.env.MAIL_USER?.trim() || "",
    password: process.env.MAIL_PASSWORD || "",
    connectionTimeout: toTimeout(
      process.env.MAIL_CONNECTION_TIMEOUT_MS,
      DEFAULT_CONNECTION_TIMEOUT_MS
    ),
    greetingTimeout: toTimeout(
      process.env.MAIL_GREETING_TIMEOUT_MS,
      DEFAULT_GREETING_TIMEOUT_MS
    ),
    socketTimeout: toTimeout(
      process.env.MAIL_SOCKET_TIMEOUT_MS,
      DEFAULT_SOCKET_TIMEOUT_MS
    ),
  };
};

const isGmailSmtpHost = (host) => {
  return host.trim().toLowerCase() === GMAIL_SMTP_HOST;
};

const getSmtpRuntimeFlags = (smtpEnv) => {
  const normalizedHost = smtpEnv.host.trim().toLowerCase();
  const requireTLS =
    smtpEnv.port === 587 && smtpEnv.secure === false && isGmailSmtpHost(normalizedHost);

  return {
    requireTLS,
    tlsServername: smtpEnv.host || null,
  };
};

const getMailtrapApiEnv = () => {
  return {
    ...getCommonMailEnv(),
    apiToken: process.env.MAILTRAP_API_TOKEN?.trim() || "",
    apiUrl:
      process.env.MAILTRAP_API_URL?.trim() || DEFAULT_MAILTRAP_API_URL,
    timeoutMs: toTimeout(
      process.env.MAIL_API_TIMEOUT_MS,
      DEFAULT_API_TIMEOUT_MS
    ),
  };
};

const getGmailApiEnv = () => {
  return {
    ...getCommonMailEnv(),
    clientId: process.env.GMAIL_CLIENT_ID?.trim() || "",
    clientSecret: process.env.GMAIL_CLIENT_SECRET?.trim() || "",
    refreshToken: process.env.GMAIL_REFRESH_TOKEN?.trim() || "",
    user: process.env.GMAIL_USER?.trim() || "",
    timeoutMs: toTimeout(
      process.env.MAIL_API_TIMEOUT_MS,
      DEFAULT_API_TIMEOUT_MS
    ),
  };
};

export const getMissingMailEnvVars = () => {
  const provider = getMailProvider();

  if (provider === MAIL_PROVIDERS.MAILTRAP_API) {
    const mailEnv = getMailtrapApiEnv();

    return [
      !mailEnv.apiToken && "MAILTRAP_API_TOKEN",
      !mailEnv.apiUrl && "MAILTRAP_API_URL",
      !mailEnv.from && "MAIL_FROM",
    ].filter(Boolean);
  }

  if (provider === MAIL_PROVIDERS.GMAIL_API) {
    const mailEnv = getGmailApiEnv();

    return [
      !mailEnv.clientId && "GMAIL_CLIENT_ID",
      !mailEnv.clientSecret && "GMAIL_CLIENT_SECRET",
      !mailEnv.refreshToken && "GMAIL_REFRESH_TOKEN",
      !mailEnv.user && "GMAIL_USER",
      !mailEnv.from && "MAIL_FROM",
    ].filter(Boolean);
  }

  const mailEnv = getSmtpEnv();

  return [
    !mailEnv.host && "MAIL_HOST",
    !mailEnv.user && "MAIL_USER",
    !mailEnv.password && "MAIL_PASSWORD",
    !mailEnv.from && "MAIL_FROM",
  ].filter(Boolean);
};

export const isMailConfigured = () => {
  return getMissingMailEnvVars().length === 0;
};

export const getMailFromValue = () => {
  const mailEnv = getCommonMailEnv();

  if (!mailEnv.fromName) {
    return mailEnv.from;
  }

  return `"${mailEnv.fromName}" <${mailEnv.from}>`;
};

let transporter = null;
let transporterProvider = null;
let transporterSignature = null;

export const getMailtrapApiConfig = () => {
  return getMailtrapApiEnv();
};

export const getGmailApiConfig = () => {
  return getGmailApiEnv();
};

export const getSmtpConfig = () => {
  return getSmtpEnv();
};

export const getSmtpTransportOptions = () => {
  const smtpEnv = getSmtpEnv();
  const runtimeFlags = getSmtpRuntimeFlags(smtpEnv);
  const transportOptions = {
    host: smtpEnv.host,
    port: smtpEnv.port,
    secure: smtpEnv.secure,
    connectionTimeout: smtpEnv.connectionTimeout,
    greetingTimeout: smtpEnv.greetingTimeout,
    socketTimeout: smtpEnv.socketTimeout,
    auth: {
      user: smtpEnv.user,
      pass: smtpEnv.password,
    },
  };

  if (runtimeFlags.requireTLS) {
    transportOptions.requireTLS = true;
  }

  if (runtimeFlags.tlsServername) {
    transportOptions.tls = {
      servername: runtimeFlags.tlsServername,
    };
  }

  return transportOptions;
};

export const getSmtpConfigSummary = () => {
  const smtpEnv = getSmtpEnv();
  const runtimeFlags = getSmtpRuntimeFlags(smtpEnv);

  return {
    provider: MAIL_PROVIDERS.SMTP,
    host: smtpEnv.host || null,
    port: smtpEnv.port,
    secure: smtpEnv.secure,
    requireTLS: runtimeFlags.requireTLS,
    tlsServername: runtimeFlags.tlsServername,
    hasUser: Boolean(smtpEnv.user),
    hasPassword: Boolean(smtpEnv.password),
    fromDomain: smtpEnv.from.split("@")[1] || null,
    connectionTimeout: smtpEnv.connectionTimeout,
    greetingTimeout: smtpEnv.greetingTimeout,
    socketTimeout: smtpEnv.socketTimeout,
  };
};

export const getGmailApiConfigSummary = () => {
  const gmailApiEnv = getGmailApiEnv();

  return {
    provider: MAIL_PROVIDERS.GMAIL_API,
    hasClientId: Boolean(gmailApiEnv.clientId),
    hasClientSecret: Boolean(gmailApiEnv.clientSecret),
    hasRefreshToken: Boolean(gmailApiEnv.refreshToken),
    hasUser: Boolean(gmailApiEnv.user),
    user: gmailApiEnv.user || null,
    fromDomain: gmailApiEnv.from.split("@")[1] || null,
    timeoutMs: gmailApiEnv.timeoutMs,
  };
};

export const getMailSenderIdentity = () => {
  return getCommonMailEnv();
};

export const resetMailTransporter = () => {
  transporter = null;
  transporterProvider = null;
  transporterSignature = null;
};

export const getMailTransporter = () => {
  if (getMailProvider() !== MAIL_PROVIDERS.SMTP || !isMailConfigured()) {
    return null;
  }

  const transportOptions = getSmtpTransportOptions();
  const nextSignature = JSON.stringify(transportOptions);

  if (
    transporter &&
    transporterProvider === MAIL_PROVIDERS.SMTP &&
    transporterSignature === nextSignature
  ) {
    return transporter;
  }

  transporter = nodemailer.createTransport(transportOptions);
  transporterProvider = MAIL_PROVIDERS.SMTP;
  transporterSignature = nextSignature;

  return transporter;
};
