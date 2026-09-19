import { z } from 'zod';

export const sendOtpSchema = z.object({
  phone: z.string().min(1, 'Phone is required'),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(1, 'Phone is required'),
  code: z.string().length(6, 'OTP must be 6 digits'),
});

export const passwordLoginSchema = z.object({
  phone: z.string().min(1, 'Phone is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const googleLoginSchema = z.object({
  idToken: z.string().min(1, 'Google ID token required'),
});

export const registerSchema = z.object({
  phone: z.string().min(1, 'Phone is required'),
  password: z.string().min(6).optional(),
  nickname: z.string().min(2).max(30),
  avatar: z.string().url().optional(),
});

export const resetPasswordSchema = z.object({
  phone: z.string().min(1, 'Phone is required'),
  idToken: z.string().min(1, 'Verification token required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});
