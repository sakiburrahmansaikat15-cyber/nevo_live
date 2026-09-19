import { z } from 'zod';

export const submitVerificationSchema = z.object({
  accountType: z.enum(['host', 'agency']),
  fullName: z.string().min(2).max(100),
  olaId: z.string().min(4).max(50),
  dateOfBirth: z.string().min(4).max(20),
  documentType: z.enum(['nid', 'olaid']),
  documentFrontUrl: z.string().url(),
  documentBackUrl: z.string().url(),
  selfieUrl: z.string().url(),
});

export const verificationStatusQuerySchema = z.object({
  status: z.enum(['pending', 'under_review', 'verified', 'rejected']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
