import nodemailer from "nodemailer";

const DEFAULT_MAIL_PORT = 587;

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

const getMailEnv = () => {
  const port = toPort(process.env.MAIL_PORT);
  const secure =
    typeof process.env.MAIL_SECURE === "string"
      ? toBoolean(process.env.MAIL_SECURE)
      : port === 465;

  return {
    host: process.env.MAIL_HOST?.trim() || "",
    port,
    secure,
    user: process.env.MAIL_USER?.trim() || "",
    password: process.env.MAIL_PASSWORD || "",
    from: process.env.MAIL_FROM?.trim() || "",
    fromName: process.env.MAIL_FROM_NAME?.trim() || "",
  };
};

export const getMissingMailEnvVars = () => {
  const mailEnv = getMailEnv();

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
  const mailEnv = getMailEnv();

  if (!mailEnv.fromName) {
    return mailEnv.from;
  }

  return `"${mailEnv.fromName}" <${mailEnv.from}>`;
};

let transporter = null;

export const getMailTransporter = () => {
  if (!isMailConfigured()) {
    return null;
  }

  if (transporter) {
    return transporter;
  }

  const mailEnv = getMailEnv();

  transporter = nodemailer.createTransport({
    host: mailEnv.host,
    port: mailEnv.port,
    secure: mailEnv.secure,
    auth: {
      user: mailEnv.user,
      pass: mailEnv.password,
    },
  });

  return transporter;
};
