import { VerificationRequest, User, Notification } from '../models';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';
import { auditService } from './audit.service';
import { getIO } from '../socket';

export const VERIFICATION_REQUIRED_CODE = 'VERIFICATION_REQUIRED';

/** Push the user's own verification state into the `User.verification` block. */
const syncUserVerification = async (userId: string, request: any) => {
  const verified = request.status === 'verified';
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        verification: {
          status: verified
            ? 'VERIFIED'
            : request.status === 'rejected'
            ? 'REJECTED'
            : request.status === 'under_review'
            ? 'UNDER_REVIEW'
            : 'PENDING',
          type: request.accountType,
          verified,
          verifiedAt: verified ? request.reviewedAt || new Date() : undefined,
          rejectionReason: request.status === 'rejected' ? request.rejectionReason : undefined,
          submittedAt: request.submittedAt,
          reviewedAt: request.reviewedAt || undefined,
        },
      },
    }
  );
};

const notifyAdmins = async (title: string, message: string) => {
  const admins = await User.find({ role: 'admin' }).select('_id');
  for (const admin of admins) {
    await Notification.create({ userId: admin._id, type: 'system', title, message });
  }
  try {
    getIO().emit('verification:new', {});
  } catch {
    // socket not initialized
  }
};

/** Does this user need verification for restricted (creator/agency) features? */
export const requiresVerification = (user: any): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return false;
  // Agents and hosts always need verification; normal users don't (until they go live).
  return user.role === 'agent' || user.role === 'host';
};

/** Is this user allowed to use restricted features right now? */
export const isVerified = (user: any): boolean => {
  return !!user?.verification?.verified || user?.role === 'admin';
};

/** Throw 403 VERIFICATION_REQUIRED unless the user may use restricted features. */
export const assertVerified = (user: any) => {
  if (!requiresVerification(user)) return;
  if (!isVerified(user)) {
    throw new AppError('Please verify your account before using this feature', 403, VERIFICATION_REQUIRED_CODE);
  }
};

export const verificationService = {
  /** User submits (or re-submits after a rejection) a verification application. */
  async submit(userId: string, body: {
    accountType: 'host' | 'agency';
    fullName: string;
    olaId: string;
    dateOfBirth: string;
    documentType: 'nid' | 'olaid';
    documentFrontUrl: string;
    documentBackUrl: string;
    selfieUrl: string;
  }) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    // Account-type eligibility: only hosts/agents (or users about to become hosts) may apply.
    const eligible = user.role === 'host' || user.role === 'agent' || user.role === 'user';
    if (!eligible) throw new AppError('This account type does not require verification', 400);

    const existing = await VerificationRequest.findOne({ userId });
    if (existing && existing.status === 'verified') {
      throw new AppError('Your account is already verified', 400);
    }
    if (existing && existing.status === 'pending') {
      throw new AppError('You already have a verification request under review', 400);
    }
    if (existing && existing.status === 'under_review') {
      throw new AppError('You already have a verification request under review', 400);
    }

    const now = new Date();

    if (existing) {
      // Re-submission after rejection — replace the sensitive details, keep history.
      existing.accountType = body.accountType;
      existing.fullName = body.fullName;
      existing.olaId = body.olaId;
      existing.dateOfBirth = body.dateOfBirth;
      existing.documentType = body.documentType;
      existing.documentFrontUrl = body.documentFrontUrl;
      existing.documentBackUrl = body.documentBackUrl;
      existing.selfieUrl = body.selfieUrl;
      existing.status = 'pending';
      existing.rejectionReason = undefined;
      existing.reviewedAt = undefined;
      existing.reviewedBy = undefined;
      existing.submittedAt = now;
      existing.auditLog.push({
        action: 'RESUBMITTED',
        from: 'REJECTED',
        to: 'PENDING',
        timestamp: now,
      } as any);
      await existing.save();
      await syncUserVerification(userId, existing);
      await auditService.logAudit(userId, 'verification_resubmit', 'VerificationRequest', existing._id.toString());
      return existing;
    }

    const request = await VerificationRequest.create({
      userId,
      accountType: body.accountType,
      fullName: body.fullName,
      olaId: body.olaId,
      dateOfBirth: body.dateOfBirth,
      documentType: body.documentType,
      documentFrontUrl: body.documentFrontUrl,
      documentBackUrl: body.documentBackUrl,
      selfieUrl: body.selfieUrl,
      status: 'pending',
      submittedAt: now,
      auditLog: [{ action: 'SUBMITTED', from: 'NOT_SUBMITTED', to: 'PENDING', timestamp: now }],
    });

    await syncUserVerification(userId, request);
    await auditService.logAudit(userId, 'verification_submit', 'VerificationRequest', request._id.toString());

    // Notify all admins + broadcast so the admin panel refreshes.
    await notifyAdmins('New verification request', `${user.nickname} submitted a ${body.accountType} verification request`);

    // Confirm to the user.
    await notificationService.createNotification(
      userId,
      'system',
      'Verification submitted',
      'Your verification request has been submitted successfully. You will receive an update once the review is completed.'
    );

    return request;
  },

  /** The user's own application (sensitive fields admin-only, but own view is fine). */
  async getMyRequest(userId: string) {
    return VerificationRequest.findOne({ userId });
  },

  /** Admin: list applications with optional status filter. */
  async getAll(query: { status?: string; page: number; limit: number }) {
    const filter: any = {};
    if (query.status) filter.status = query.status;

    const total = await VerificationRequest.countDocuments(filter);
    const data = await VerificationRequest.find(filter)
      .populate('userId', 'uid nickname avatar phone role')
      .populate('reviewedBy', 'uid nickname')
      .sort({ submittedAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit);
    return { data, total };
  },

  /** Admin: approve — flips both the request and the user's verification state. */
  async approve(requestId: string, adminId: string) {
    const request = await VerificationRequest.findById(requestId);
    if (!request) throw new AppError('Verification request not found', 404);
    if (request.status === 'verified') throw new AppError('Request is already verified', 400);

    const now = new Date();
    const prevStatus = request.status;

    request.status = 'verified';
    request.reviewedAt = now;
    request.reviewedBy = adminId as any;
    request.auditLog.push({
      action: 'APPROVED',
      adminId,
      from: prevStatus === 'under_review' ? 'UNDER_REVIEW' : 'PENDING',
      to: 'VERIFIED',
      timestamp: now,
    } as any);
    await request.save();

    await syncUserVerification(request.userId.toString(), request);
    await auditService.logAudit(adminId, 'verification_approve', 'VerificationRequest', requestId);

    await notificationService.createNotification(
      request.userId.toString(),
      'system',
      'Account verified',
      'Congratulations! Your account has been verified. You can now go Live and host Voice Parties.',
      { verificationId: requestId }
    );

    // Tell the user's open app instances to refresh profile state immediately.
    try {
      getIO().to(`user:${request.userId.toString()}`).emit('verification:updated', {
        status: 'VERIFIED',
        verified: true,
      });
    } catch {
      // socket not initialized
    }

    return request;
  },

  /** Admin: reject with a reason — the user can resubmit. */
  async reject(requestId: string, adminId: string, reason?: string) {
    const request = await VerificationRequest.findById(requestId);
    if (!request) throw new AppError('Verification request not found', 404);
    if (request.status === 'verified') throw new AppError('Verified requests cannot be rejected', 400);

    const now = new Date();
    const prevStatus = request.status;

    request.status = 'rejected';
    request.rejectionReason = reason || 'Documents did not match the required criteria';
    request.reviewedAt = now;
    request.reviewedBy = adminId as any;
    request.auditLog.push({
      action: 'REJECTED',
      adminId,
      from: prevStatus === 'under_review' ? 'UNDER_REVIEW' : 'PENDING',
      to: 'REJECTED',
      timestamp: now,
    } as any);
    await request.save();

    await syncUserVerification(request.userId.toString(), request);
    await auditService.logAudit(adminId, 'verification_reject', 'VerificationRequest', requestId, { reason });

    await notificationService.createNotification(
      request.userId.toString(),
      'system',
      'Verification rejected',
      `Your verification request was not approved. Reason: ${request.rejectionReason}. You can submit a new request.`,
      { verificationId: requestId }
    );

    try {
      getIO().to(`user:${request.userId.toString()}`).emit('verification:updated', {
        status: 'REJECTED',
        verified: false,
        rejectionReason: request.rejectionReason,
      });
    } catch {
      // socket not initialized
    }

    return request;
  },
};
