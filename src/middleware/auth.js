import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api.js';

export function signToken(user) {
  return jwt.sign({ userId: user._id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export function setAuthCookie(res, token) {
  res.cookie(env.cookieName, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(env.cookieName, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    path: '/',
  });
}

export async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return next();
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.userId);
    if (user && user.status === 'active') req.user = user;
    next();
  } catch {
    next();
  }
}

export async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) throw new ApiError(401, 'Please sign in to continue.', 'UNAUTHENTICATED');
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.userId);
    if (!user) throw new ApiError(401, 'Account not found.', 'UNAUTHENTICATED');
    if (user.status !== 'active') {
      throw new ApiError(403, 'This account has been suspended.', 'ACCOUNT_SUSPENDED');
    }
    req.user = user;
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(new ApiError(401, 'Session expired. Please sign in again.', 'TOKEN_EXPIRED'));
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Please sign in to continue.', 'UNAUTHENTICATED'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to do that.', 'FORBIDDEN'));
    }
    next();
  };
}

function extractToken(req) {
  const cookie = req.cookies?.[env.cookieName];
  if (cookie) return cookie;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}
