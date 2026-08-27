import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ApiError, sendError } from '../utils/api.js';

export function notFound(req, res, next) {
  next(new ApiError(404, 'The requested resource was not found.', 'NOT_FOUND'));
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = err.statusCode || err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const isKnown = err instanceof ApiError || Boolean(err.statusCode);
  const message =
    status >= 500 && env.isProd && !isKnown
      ? 'Something went wrong. Please try again.'
      : err.message || 'Request failed.';

  if (status >= 500) {
    logger.error({ err }, 'Unhandled error');
  }

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, 400, 'That image is too large. Maximum size is 8 MB.', 'FILE_TOO_LARGE');
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return sendError(res, 400, 'You can upload at most 10 photographs per post.', 'TOO_MANY_FILES');
    }
    return sendError(res, 400, 'Unable to process the uploaded file.', 'UPLOAD_ERROR');
  }

  sendError(res, status, message, env.isProd && status >= 500 && !isKnown ? 'INTERNAL_ERROR' : code);
}
