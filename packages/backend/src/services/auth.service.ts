import { User, Agency } from '../models';
import { signToken } from '../utils/jwt';
import { hashPassword, comparePassword } from '../utils/hash';
import { AppError } from '../middleware/errorHandler';
import { verifyIdToken } from '../config/firebase';

const generateUid = async (): Promise<string> => {
  const count = await User.countDocuments();
  return String(168000 + count + 1);
};

// Self-heal: if a user is the agent of an agency but their role was corrupted
// (e.g., set to 'host' by a bad link operation), correct it so agent login/search work.
const ensureAgentRole = async (user: any) => {
  let changed = false;

  if (!user.role) {
    user.role = user.isAdmin ? 'admin' : user.isAgent ? 'agent' : user.agencyId ? 'host' : 'user';
    console.warn(`[Auth] User ${user.uid} had no role — derived role '${user.role}' from legacy flags`);
    changed = true;
  }

  // If user is an agency owner, they must be role 'agent' and not a host of their own agency
  const ownsAgency = await Agency.exists({ agentId: user._id });
  if (ownsAgency && user.role !== 'agent') {
    console.warn(`[Auth] User ${user.uid} is an agency owner but role is '${user.role}' — correcting to 'agent'`);
    user.role = 'agent';
    changed = true;
  }
  if (ownsAgency && user.agencyId) {
    // An agent cannot be a host of their own agency
    const own = await Agency.findById(user.agencyId);
    if (own && own.agentId.toString() === user._id.toString()) {
      console.warn(`[Auth] User ${user.uid} was host of their own agency — clearing agencyId`);
      user.agencyId = undefined as any;
      changed = true;
    }
  }

  if (changed) await user.save();
  return user;
};

export const authService = {
  async sendOtp(_phone: string): Promise<void> {
    // Phone OTP is handled client-side via Firebase Auth SDK.
    // The client sends a verification code via Firebase,
    // receives an ID token, and sends it to the backend.
    // Backend verifies the ID token with Firebase Admin SDK.
    // Actual SMS sending is configured in Firebase Console.
    return;
  },

  async verifyOtpAndLogin(phone: string, _code: string, idToken: string) {
    const decoded = await verifyIdToken(idToken);
    if (!decoded) throw new AppError('Firebase auth unavailable — check FIREBASE_SERVICE_ACCOUNT', 503);
    const firebasePhone = decoded.phone_number || phone;

    let user = await User.findOne({ phone: firebasePhone });

    if (!user) {
      // Auto-register
      const uid = await generateUid();
      user = await User.create({
        uid,
        phone: firebasePhone,
        nickname: `User${uid.slice(-4)}`,
        avatar: '',
      });
    }

    if (user.isBanned) {
      throw new AppError('Account is banned', 403);
    }

    await ensureAgentRole(user);

    const token = signToken({
      userId: user._id.toString(),
      uid: user.uid,
      role: user.role,
      isAgent: user.isAgent,
      isAdmin: user.isAdmin,
    });

    return { token, user: user.toObject() };
  },

  async loginWithPassword(phone: string, password: string) {
    console.log(`[Auth] Login attempt — phone: ${phone}`);
    const user = await User.findOne({ phone }).select('+password');
    if (!user) {
      console.warn(`[Auth] Login FAILED — no user found for phone: ${phone}`);
      throw new AppError('User not found', 404);
    }

    // Self-heal: fix missing/corrupted roles before proceeding
    await ensureAgentRole(user);

    console.log(`[Auth] User found — uid: ${user.uid}, role: ${user.role}, isAgent: ${user.isAgent}, isAdmin: ${user.isAdmin}, banned: ${user.isBanned}`);

    if (!user.password) {
      console.warn(`[Auth] Login FAILED — user ${user.uid} has no password set (OTP-only account)`);
      throw new AppError('Please use OTP login', 400);
    }
    if (user.isBanned) {
      console.warn(`[Auth] Login FAILED — user ${user.uid} is banned`);
      throw new AppError('Account is banned', 403);
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      console.warn(`[Auth] Login FAILED — invalid password for user ${user.uid} (${phone})`);
      throw new AppError('Invalid password', 401);
    }

    console.log(`[Auth] Login SUCCESS — uid: ${user.uid}, role: ${user.role}`);
    const token = signToken({
      userId: user._id.toString(),
      uid: user.uid,
      role: user.role,
      isAgent: user.isAgent,
      isAdmin: user.isAdmin,
    });

    return { token, user: user.toObject() };
  },

  async loginWithGoogle(idToken: string) {
    const decoded = await verifyIdToken(idToken);
    if (!decoded) throw new AppError('Firebase auth unavailable — check FIREBASE_SERVICE_ACCOUNT', 503);
    const googleId = decoded.uid;
    const email = decoded.email || '';
    const name = decoded.name || 'User';

    let user = await User.findOne({ googleId });

    if (!user) {
      const uid = await generateUid();
      user = await User.create({
        uid,
        phone: `google_${googleId}`,
        googleId,
        nickname: name,
        avatar: decoded.picture || '',
      });
    }

    if (user.isBanned) throw new AppError('Account is banned', 403);

    await ensureAgentRole(user);

    const token = signToken({
      userId: user._id.toString(),
      uid: user.uid,
      role: user.role,
      isAgent: user.isAgent,
      isAdmin: user.isAdmin,
    });

    return { token, user: user.toObject() };
  },

  async devLogin(phone: string, nickname?: string) {
    let user = await User.findOne({ phone });
    if (!user) {
      const uid = await generateUid();
      user = await User.create({
        uid,
        phone,
        nickname: nickname || `User${uid.slice(-4)}`,
        avatar: '',
      });
    }
    await ensureAgentRole(user);
    const token = signToken({
      userId: user._id.toString(),
      uid: user.uid,
      role: user.role,
      isAgent: user.isAgent,
      isAdmin: user.isAdmin,
    });
    return { token, user: user.toObject() };
  },

  async register(phone: string, nickname: string, password?: string) {
    const existing = await User.findOne({ phone });
    if (existing) throw new AppError('Phone already registered', 409);

    const uid = await generateUid();
    const data: any = {
      uid,
      phone,
      nickname,
      avatar: '',
    };

    if (password) {
      data.password = await hashPassword(password);
    }

    const user = await User.create(data);

    const token = signToken({
      userId: user._id.toString(),
      uid: user.uid,
      role: user.role,
      isAgent: user.isAgent,
      isAdmin: user.isAdmin,
    });

    return { token, user: user.toObject() };
  },

  /**
   * Forgot-password reset.
   *
   * The client proves phone ownership via Firebase phone OTP and passes the
   * resulting Firebase ID token. We verify the token, assert the token's phone
   * matches the requested phone, then set the new bcrypt password.
   * Never log the OTP/code/idToken.
   */
  async resetPassword(phone: string, idToken: string, newPassword: string) {
    const decoded = await verifyIdToken(idToken);
    if (!decoded) throw new AppError('Firebase auth unavailable — check FIREBASE_SERVICE_ACCOUNT', 503);

    // Phone-ownership proof: the verified Firebase user must own this phone.
    if (!decoded.phone_number || decoded.phone_number !== phone) {
      throw new AppError('Phone verification failed', 401);
    }

    const user = await User.findOne({ phone });
    if (!user) throw new AppError('Account not found', 404);

    if (user.isBanned) throw new AppError('Account is banned', 403);

    user.password = await hashPassword(newPassword);
    await user.save();

    return { success: true };
  },
};
