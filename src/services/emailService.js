import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

function createTransport() {
  if (!env.smtp.host) return null;
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
}

const transport = createTransport();

export async function sendMail({ to, subject, text, html }) {
  if (!transport) {
    logger.info({ to, subject, text }, 'Email (console fallback)');
    return;
  }
  await transport.sendMail({
    from: env.smtp.from,
    to,
    subject,
    text,
    html: html || `<p>${text}</p>`,
  });
}

export async function sendVerificationEmail(user, token) {
  const url = `${env.clientUrl}/verify-email/${token}`;
  await sendMail({
    to: user.email,
    subject: 'Verify your IUB LFE account',
    text: `Welcome to the IUB LFE platform. Verify your email: ${url}`,
  });
}

export async function sendPasswordResetEmail(user, token) {
  const url = `${env.clientUrl}/reset-password/${token}`;
  await sendMail({
    to: user.email,
    subject: 'Reset your IUB LFE password',
    text: `Reset your password using this link (valid for 1 hour): ${url}`,
  });
}
