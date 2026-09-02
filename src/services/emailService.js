import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let smtpTransport;

export function isMailConfigured() {
  return Boolean(env.resendApiKey || env.smtp.host);
}

function getSmtpTransport() {
  if (!env.smtp.host) return null;
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return smtpTransport;
}

function publicSiteUrl() {
  return env.clientOrigins?.[0] || String(env.clientUrl).split(',')[0].trim().replace(/\/$/, '');
}

async function sendWithResend({ to, subject, text, html }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.smtp.from,
      to: [to],
      subject,
      text,
      html: html || `<p>${text}</p>`,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend failed (${response.status}): ${detail.slice(0, 300)}`);
  }
}

export async function sendMail({ to, subject, text, html }) {
  if (env.resendApiKey) {
    await sendWithResend({ to, subject, text, html });
    return true;
  }

  const transport = getSmtpTransport();
  if (!transport) {
    logger.info({ to, subject, text }, 'Email (console fallback)');
    return false;
  }

  await transport.sendMail({
    from: env.smtp.from,
    to,
    subject,
    text,
    html: html || `<p>${text}</p>`,
  });
  return true;
}

export async function sendVerificationEmail(user, token) {
  const url = `${publicSiteUrl()}/verify-email/${encodeURIComponent(token)}`;
  await sendMail({
    to: user.email,
    subject: 'Verify your IUB LFE account',
    text: `Welcome to the IUB LFE platform. Verify your email: ${url}`,
  });
}

export async function sendPasswordResetEmail(user, token) {
  const url = `${publicSiteUrl()}/reset-password/${encodeURIComponent(token)}`;
  const sent = await sendMail({
    to: user.email,
    subject: 'Reset your IUB LFE password',
    text: `Reset your password using this link (valid for 1 hour): ${url}`,
    html: `<p>Reset your password using this link (valid for 1 hour):</p><p><a href="${url}">${url}</a></p>`,
  });
  return sent;
}
