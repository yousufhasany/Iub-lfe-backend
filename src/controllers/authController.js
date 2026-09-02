import { asyncHandler, sendSuccess } from '../utils/api.js';
import * as authService from '../services/authService.js';
import { setAuthCookie, clearAuthCookie } from '../middleware/auth.js';
import { getMe } from '../services/userService.js';

export const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.registerUser(req.body);
  setAuthCookie(res, token);
  sendSuccess(res, { user, token }, 'Account created.', 201);
});

export const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.loginUser(req.body);
  setAuthCookie(res, token);
  sendSuccess(res, { user, token }, 'Signed in.');
});

export const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  sendSuccess(res, {}, 'Signed out.');
});

export const me = asyncHandler(async (req, res) => {
  const user = await getMe(req.user);
  sendSuccess(res, { user });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email);
  sendSuccess(res, {}, 'If that email exists, a reset link has been sent.');
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  sendSuccess(res, {}, 'Password updated. You can sign in now.');
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const user = await authService.verifyEmail(req.params.token);
  sendSuccess(res, { user }, 'Email verified.');
});
