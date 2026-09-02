import { Readable } from 'node:stream';

function toBuffer(raw) {
  if (raw == null) return null;
  if (Buffer.isBuffer(raw)) return raw.length ? raw : null;
  if (typeof raw === 'string') return raw ? Buffer.from(raw) : null;
  if (raw instanceof ArrayBuffer) return raw.byteLength ? Buffer.from(raw) : null;
  if (ArrayBuffer.isView(raw)) {
    return raw.byteLength ? Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength) : null;
  }
  return null;
}

/**
 * Vercel Node functions often buffer multipart bodies onto `req.body` and
 * consume the stream. Multer then sees an empty request. Rebuild a readable
 * stream so Express/Multer can parse the upload.
 */
export function restoreMultipartRequest(req) {
  const contentType = String(req?.headers?.['content-type'] || '');
  if (!contentType.toLowerCase().includes('multipart/form-data')) return req;

  const buffer = toBuffer(req.body) || toBuffer(req.rawBody);
  if (!buffer) return req;

  const stream = Readable.from(buffer);
  stream.headers = req.headers;
  stream.rawHeaders = req.rawHeaders;
  stream.method = req.method;
  stream.url = req.url;
  stream.originalUrl = req.originalUrl;
  stream.socket = req.socket;
  stream.connection = req.connection || req.socket;
  stream.aborted = Boolean(req.aborted);
  stream.complete = false;
  stream.httpVersion = req.httpVersion;
  stream.httpVersionMajor = req.httpVersionMajor;
  stream.httpVersionMinor = req.httpVersionMinor;
  stream.cookies = req.cookies;
  stream.secret = req.secret;
  stream.signedCookies = req.signedCookies;
  return stream;
}

export function skipSanitizeForMultipart(req) {
  const contentType = String(req?.headers?.['content-type'] || '');
  if (contentType.toLowerCase().includes('multipart/form-data')) return true;
  if (Buffer.isBuffer(req?.body) || ArrayBuffer.isView(req?.body)) return true;
  return false;
}
