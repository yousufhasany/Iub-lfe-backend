import { z } from 'zod';

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128);

export const registerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(80),
    email: z.string().email().toLowerCase(),
    password,
    studentId: z.string().min(3).max(20).optional(),
    department: z.string().max(80).optional(),
    semesterId: z.string().optional(),
    venueId: z.string().optional(),
    groupId: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(1),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    password,
  }),
});

export const verifyEmailSchema = z.object({
  params: z.object({
    token: z.string().min(10),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(80).optional(),
    studentId: z.string().min(3).max(20).optional(),
    department: z.string().max(80).optional(),
    batch: z.string().max(20).optional(),
    bio: z.string().max(500).optional(),
    fieldVisitYear: z.coerce.number().int().min(2000).max(2100).optional(),
    semesterId: z.string().optional(),
    groupId: z.string().optional(),
    venueId: z.string().optional(),
  }),
});

export const paginationQuery = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }).passthrough(),
});
