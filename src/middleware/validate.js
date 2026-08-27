import { ZodError } from 'zod';
import { ApiError } from '../utils/api.js';

export function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (parsed.body) req.body = parsed.body;
      if (parsed.query) req.query = parsed.query;
      if (parsed.params) req.params = parsed.params;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.errors[0]?.message || 'Invalid request.';
        return next(new ApiError(400, message, 'VALIDATION_ERROR'));
      }
      next(err);
    }
  };
}
