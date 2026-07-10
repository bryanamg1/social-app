import dotenv from "dotenv";

import {
  getMailFromValue,
  getMailProvider,
  getMailTransporter,
  getMissingMailEnvVars,
  getSmtpConfigSummary,
  isMailConfigured,
  MAIL_PROVIDERS,
} from "../src/config/mail.js";

dotenv.config();

const APP_NAME = "Social App";
const MAX_LOG_LENGTH = 500;

const truncateValue = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  if (value.length <= MAX_LOG_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_LOG_LENGTH)}...`;
};

const logConfig = () => {
  const provider = getMailProvider();

  if (provider === MAIL_PROVIDERS.SMTP) {
    console.info("[mail-provider-check] smtp config", getSmtpConfigSummary());
    return;
  }

  console.info("[mail-provider-check] provider selected", { provider });
};

const sendOptionalTestEmail = async (transporter) => {
  const recipient = process.env.TEST_MAIL_TO?.trim();

  if (!recipient) {
    return false;
  }

  await transporter.sendMail({
    from: getMailFromValue(),
    to: recipient,
    subject: `${APP_NAME}: mail provider check`,
    text: "SMTP verification email from Social App.",
  });

  console.info("[mail-provider-check] test email sent", {
    provider: MAIL_PROVIDERS.SMTP,
    hasRecipient: true,
    recipientDomain: recipient.split("@")[1] || null,
  });

  return true;
};

const main = async () => {
  if (!isMailConfigured()) {
    console.error("[mail-provider-check] missing env vars", {
      provider: getMailProvider(),
      missingEnvVars: getMissingMailEnvVars(),
    });
    process.exitCode = 1;
    return;
  }

  const provider = getMailProvider();
  logConfig();

  if (provider !== MAIL_PROVIDERS.SMTP) {
    console.info("[mail-provider-check] verify skipped", {
      provider,
      reason: "SMTP transporter verification is only available for smtp provider.",
    });
    return;
  }

  const transporter = getMailTransporter();

  try {
    await transporter.verify();
    console.info("[mail-provider-check] transporter verify ok", {
      provider: MAIL_PROVIDERS.SMTP,
    });
    await sendOptionalTestEmail(transporter);
  } catch (error) {
    console.error("[mail-provider-check] transporter verify failed", {
      ...getSmtpConfigSummary(),
      code: error?.code || null,
      command: error?.command || null,
      responseCode: error?.responseCode || null,
      response: truncateValue(error?.response || null),
      reason: truncateValue(error?.reason || null),
      message: truncateValue(error?.message || null),
    });
    process.exitCode = 1;
  }
};

await main();
