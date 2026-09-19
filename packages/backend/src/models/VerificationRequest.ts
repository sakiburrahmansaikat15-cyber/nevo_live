import { Schema, model, Document } from 'mongoose';

export interface IVerificationAuditEntry {
  action: 'SUBMITTED' | 'OPENED' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED' | 'REVOKED';
  adminId?: Schema.Types.ObjectId;
  from: string;
  to: string;
  timestamp: Date;
}

export interface IVerificationRequestDocument extends Document {
  userId: Schema.Types.ObjectId;
  accountType: 'host' | 'agency';
  fullName: string;
  olaId: string;
  dateOfBirth: string;
  documentType: 'nid' | 'olaid';
  documentFrontUrl: string;
  documentBackUrl: string;
  selfieUrl: string;
  status: 'pending' | 'under_review' | 'verified' | 'rejected';
  rejectionReason?: string;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: Schema.Types.ObjectId;
  auditLog: IVerificationAuditEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const verificationRequestSchema = new Schema<IVerificationRequestDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    accountType: { type: String, enum: ['host', 'agency'], required: true },
    fullName: { type: String, required: true, trim: true },
    olaId: { type: String, required: true, trim: true },
    dateOfBirth: { type: String, required: true },
    documentType: { type: String, enum: ['nid', 'olaid'], required: true },
    documentFrontUrl: { type: String, required: true },
    documentBackUrl: { type: String, required: true },
    selfieUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'verified', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: { type: String },
    submittedAt: { type: Date, required: true },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    auditLog: [
      {
        action: {
          type: String,
          enum: ['SUBMITTED', 'OPENED', 'APPROVED', 'REJECTED', 'RESUBMITTED', 'REVOKED'],
        },
        adminId: { type: Schema.Types.ObjectId, ref: 'User' },
        from: { type: String },
        to: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

verificationRequestSchema.index({ status: 1, submittedAt: -1 });

export const VerificationRequest = model<IVerificationRequestDocument>(
  'VerificationRequest',
  verificationRequestSchema
);
