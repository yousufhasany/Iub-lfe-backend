export class ApiError extends Error {
  constructor(statusCode, message, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function sendSuccess(res, data = {}, message, status = 200) {
  const payload = { success: true, data };
  if (message) payload.message = message;
  return res.status(status).json(payload);
}

export function sendError(res, status, message, code = 'ERROR') {
  return res.status(status).json({ success: false, message, code });
}

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
