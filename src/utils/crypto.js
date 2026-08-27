import sanitizeHtml from 'sanitize-html';
import crypto from 'crypto';

export function sanitizeText(value, maxLength = 2000) {
  if (typeof value !== 'string') return '';
  const cleaned = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
  return cleaned.slice(0, maxLength);
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
