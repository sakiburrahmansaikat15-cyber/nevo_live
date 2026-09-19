import { Schema, model, Document } from 'mongoose';

export interface INotificationDocument extends Document {
  userId: Schema.Types.ObjectId;
  type: 'rate_updated' | 'order' | 'withdrawal' | 'agent_linked' | 'recharge' | 'system' | 'gift';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['rate_updated', 'order', 'withdrawal', 'agent_linked', 'recharge', 'system', 'gift'],
      default: 'system',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification = model<INotificationDocument>('Notification', notificationSchema);
