import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api.js';
import { hashToken, randomToken } from '../utils/crypto.js';
import { serializeUser } from '../utils/serialize.js';
import { sendPasswordResetEmail, sendVerificationEmail } from './emailService.js';
import { signToken } from '../middleware/auth.js';

const IUB_EMAIL = /@iub\.edu\.bd$/i;

export async function registerUser({ fullName, email, password, studentId, department, semesterId, venueId, groupId }) {
  if (env.requireIubEmail && !IUB_EMAIL.test(email)) {
    throw new ApiError(400, 'Please use your IUB email address.', 'IUB_EMAIL_REQUIRED');
  }
  const exists = await User.findOne({ email });
  if (exists) {
    throw new ApiError(409, 'An account with this email already exists.', 'EMAIL_TAKEN');
  }
  if (studentId) {
    const taken = await User.findOne({ 'profile.studentId': studentId });
    if (taken) throw new ApiError(409, 'This student ID is already registered.', 'STUDENT_ID_TAKEN');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const verifyToken = randomToken();
  const user = await User.create({
    email,
    passwordHash,
    role: 'student',
    emailVerified: !env.requireIubEmail,
    verificationTokenHash: hashToken(verifyToken),
    verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    profile: { fullName, studentId, department },
  });

  if (semesterId || venueId || groupId) {
    const { applyLfeAssignment } = await import('./userService.js');
    await applyLfeAssignment(user, { semesterId, venueId, groupId });
  }

  if (env.requireIubEmail || env.smtp.host) {
    await sendVerificationEmail(user, verifyToken);
  }

  const token = signToken(user);
  return { user: serializeUser(user, user, { includeEmail: true }), token };
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) throw new ApiError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new ApiError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
  if (user.status !== 'active') {
    throw new ApiError(403, 'This account has been suspended.', 'ACCOUNT_SUSPENDED');
  }
  user.lastLoginAt = new Date();
  await user.save();
  const token = signToken(user);
  return { user: serializeUser(user, user, { includeEmail: true }), token };
}

export async function requestPasswordReset(email) {
  const user = await User.findOne({ email });
  if (!user) return;
  const token = randomToken();
  user.resetPasswordTokenHash = hashToken(token);
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();
  await sendPasswordResetEmail(user, token);
}

export async function resetPassword(token, password) {
  const user = await User.findOne({
    resetPasswordTokenHash: hashToken(token),
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordTokenHash +passwordHash');
  if (!user) throw new ApiError(400, 'This reset link is invalid or has expired.', 'INVALID_RESET_TOKEN');
  user.passwordHash = await bcrypt.hash(password, 12);
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
}

export async function verifyEmail(token) {
  const user = await User.findOne({
    verificationTokenHash: hashToken(token),
    verificationExpires: { $gt: new Date() },
  }).select('+verificationTokenHash');
  if (!user) throw new ApiError(400, 'This verification link is invalid or has expired.', 'INVALID_VERIFY_TOKEN');
  user.emailVerified = true;
  user.verificationTokenHash = undefined;
  user.verificationExpires = undefined;
  await user.save();
  return serializeUser(user, user, { includeEmail: true });
}

export async function ensureBootstrapAdmin() {
  if (!env.adminEmail || !env.adminPassword) return;
  const existing = await User.findOne({ role: 'admin' });
  if (existing) return;
  const passwordHash = await bcrypt.hash(env.adminPassword, 12);
  await User.create({
    email: env.adminEmail.toLowerCase(),
    passwordHash,
    role: 'admin',
    emailVerified: true,
    profile: { fullName: 'LFE Administrator' },
  });
}
