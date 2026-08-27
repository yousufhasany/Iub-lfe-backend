import rateLimit from 'express-rate-limit';

const windowMs = 15 * 60 * 1000;
const skip = () => process.env.NODE_ENV === 'test';

export const authLimiter = rateLimit({
  windowMs,
  max: 20,
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.', code: 'RATE_LIMITED' },
});

export const registerLimiter = rateLimit({
  windowMs,
  max: 10,
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registrations from this network.', code: 'RATE_LIMITED' },
});

export const passwordResetLimiter = rateLimit({
  windowMs,
  max: 8,
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password reset requests.', code: 'RATE_LIMITED' },
});

export const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'You are posting too quickly. Please slow down.', code: 'RATE_LIMITED' },
});

export const commentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 80,
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many comments. Please wait a moment.', code: 'RATE_LIMITED' },
});

export const reactionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 120,
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many reactions. Please wait.', code: 'RATE_LIMITED' },
});

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many uploads. Please try again later.', code: 'RATE_LIMITED' },
});

export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 40,
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Search is temporarily limited. Please wait.', code: 'RATE_LIMITED' },
});

export const globalLimiter = rateLimit({
  windowMs,
  max: 400,
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
});
