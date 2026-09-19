import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { User } from '../models';
import { requiresVerification, isVerified } from '../services/verification.service';

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user?.isAdmin && req.user?.role !== 'admin') {
    sendError(res, 'Admin access required', 403);
    return;
  }
  next();
};

export const requireAgent = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'agent' && !req.user?.isAdmin) {
    sendError(res, 'Agent access required', 403);
    return;
  }
  next();
};

export const requireHost = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'host' && req.user?.role !== 'user' && req.user?.role !== 'agent' && req.user?.role !== 'admin') {
    sendError(res, 'Host access required', 403);
    return;
  }
  next();
};

/**
 * Block unverified hosts/agents from restricted creator/agency features.
 * Admins and normal users (viewers/players) are never blocked.
 * Re-queries the DB so verification state is authoritative even though the JWT is stale.
 */
export const requireVerified = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId).lean();
    if (requiresVerification(user) && !isVerified(user)) {
      sendError(res, 'Please verify your account before using this feature', 403);
      return;
    }
    next();
  } catch {
    next();
  }
};
