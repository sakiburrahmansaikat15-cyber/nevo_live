import { Schema, model, Document } from 'mongoose';

export interface IChatDocument extends Document {
  participants: Schema.Types.ObjectId[];
  lastMessage: string;
  lastMessageAt: Date;
  lastMessageBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChatDocument>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date },
    lastMessageBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Unique index on the sorted participant pair (2-person chat)
chatSchema.index({ participants: 1 });
chatSchema.index({ lastMessageAt: -1 });

export const Chat = model<IChatDocument>('Chat', chatSchema);
