import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/authValidators.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter, passwordResetLimiter, registerLimiter } from '../middleware/rateLimits.js';

const router = Router();

router.post('/register', registerLimiter, validate(registerSchema), auth.register);
router.post('/login', authLimiter, validate(loginSchema), auth.login);
router.post('/logout', auth.logout);
router.get('/me', requireAuth, auth.me);
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), auth.forgotPassword);
router.post('/reset-password', passwordResetLimiter, validate(resetPasswordSchema), auth.resetPassword);
router.get('/verify-email/:token', validate(verifyEmailSchema), auth.verifyEmail);

export default router;
