import { Schema, model, Document } from 'mongoose';

export interface IChatMessageDocument extends Document {
  chatId: Schema.Types.ObjectId;
  senderId: Schema.Types.ObjectId;
  message: string;
  kind: 'text' | 'gift' | 'voice';
  giftId?: Schema.Types.ObjectId;
  giftName?: string;
  giftCount?: number;
  voiceUrl?: string;
  voiceDuration?: number;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessageDocument>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    kind: { type: String, enum: ['text', 'gift', 'voice'], default: 'text' },
    giftId: { type: Schema.Types.ObjectId, ref: 'Gift' },
    giftName: { type: String },
    giftCount: { type: Number },
    voiceUrl: { type: String },
    voiceDuration: { type: Number },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

chatMessageSchema.index({ chatId: 1, createdAt: 1 });

export const ChatMessage = model<IChatMessageDocument>('ChatMessage', chatMessageSchema);
