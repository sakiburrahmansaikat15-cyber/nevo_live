import { Schema, model, Document } from 'mongoose';

export interface INoble {
  type: 'silver' | 'gold' | 'platinum' | 'diamond';
  expiry: Date;
}

export interface IVerificationState {
  status: 'NOT_SUBMITTED' | 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';
  type?: 'host' | 'agency';
  verified: boolean;
  verifiedAt?: Date;
  rejectionReason?: string;
  submittedAt?: Date;
  reviewedAt?: Date;
}

export interface IUserDocument extends Document {
  uid: string;
  phone: string;
  password?: string;
  googleId?: string;
  nickname: string;
  avatar: string;
  cover: string;
  /** ISO 3166-1 alpha-2, uppercase (BD, IN, PK…). Drives the country filter. */
  country: string;
  gender: 'male' | 'female' | 'other' | 'unspecified';
  birthday?: Date;
  bio: string;
  /** Free-form interest tags shown on the details page (#Friendly, #Singer). */
  tags: string[];
  /** Touched on every authenticated request — drives the online/offline dot. */
  lastActiveAt: Date;
  level: number;
  exp: number;
  diamonds: number;
  coins: number;
  noble?: INoble;
  role: 'admin' | 'agent' | 'host' | 'user';
  isAgent: boolean;
  isAdmin: boolean;
  agencyId?: Schema.Types.ObjectId;
  sellerType: 'none' | 'official' | 'paylor';
  verification: IVerificationState;
  isBanned: boolean;
  paymentInfo?: {
    bybit: { qrCode: string; walletAddress: string };
    binance: { qrCode: string; walletAddress: string };
  };
  following: Schema.Types.ObjectId[];
  followers: Schema.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUserDocument>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    phone: { type: String, required: true, unique: true, index: true },
    password: { type: String, select: false },
    googleId: { type: String, sparse: true, index: true },
    nickname: { type: String, required: true, trim: true },
    avatar: { type: String, default: '' },
    cover: { type: String, default: '' },
    country: {
      type: String,
      default: '',
      uppercase: true,
      trim: true,
      maxlength: 2,
      index: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'unspecified'],
      default: 'unspecified',
    },
    birthday: { type: Date },
    bio: { type: String, default: '', trim: true, maxlength: 200 },
    tags: { type: [String], default: [] },
    lastActiveAt: { type: Date, default: Date.now, index: true },
    level: { type: Number, default: 1 },
    exp: { type: Number, default: 0 },
    diamonds: { type: Number, default: 0 },
    coins: { type: Number, default: 0 },
    noble: {
      type: { type: String, enum: ['silver', 'gold', 'platinum', 'diamond'] },
      expiry: Date,
    },
    role: {
      type: String,
      enum: ['admin', 'agent', 'host', 'user'],
      default: 'user',
      index: true,
    },
    isAgent: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', index: true },
    sellerType: {
      type: String,
      enum: ['none', 'official', 'paylor'],
      default: 'none',
    },
    verification: {
      status: {
        type: String,
        enum: ['NOT_SUBMITTED', 'PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'],
        default: 'NOT_SUBMITTED',
      },
      type: { type: String, enum: ['host', 'agency'] },
      verified: { type: Boolean, default: false },
      verifiedAt: { type: Date },
      rejectionReason: { type: String },
      submittedAt: { type: Date },
      reviewedAt: { type: Date },
    },
    isBanned: { type: Boolean, default: false },
    paymentInfo: {
      bybit: {
        qrCode: { type: String, default: '' },
        walletAddress: { type: String, default: '' },
      },
      binance: {
        qrCode: { type: String, default: '' },
        walletAddress: { type: String, default: '' },
      },
    },
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Derive legacy boolean flags from the role field
userSchema.pre('save', function (next) {
  this.isAdmin = this.role === 'admin';
  this.isAgent = this.role === 'agent';
  next();
});

export const User = model<IUserDocument>('User', userSchema);
