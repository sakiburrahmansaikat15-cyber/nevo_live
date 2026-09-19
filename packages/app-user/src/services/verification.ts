import type { VerificationState } from '../types';

/**
 * Creator-feature gate: only verified hosts/agents may go live / host voice
 * parties. Normal users, admins and anyone with a verified account pass.
 * The backend enforces the same rule (403 VERIFICATION_REQUIRED) — this is UX only.
 */
export const canUseCreatorFeatures = (verification?: VerificationState, role?: string): boolean => {
  if (role === 'admin') return true;
  return verification?.verified === true;
};
