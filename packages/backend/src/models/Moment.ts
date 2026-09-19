import { Schema, model, Document } from 'mongoose';

export interface IComment {
  userId: Schema.Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface IMomentDocument extends Document {
  userId: Schema.Types.ObjectId;
  content?: string;
  media: string[];
  likes: Schema.Types.ObjectId[];
  comments: IComment[];
  createdAt: Date;
  updatedAt: Date;
}

const momentSchema = new Schema<IMomentDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, trim: true },
    media: [{ type: String }],
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

momentSchema.index({ createdAt: -1 });
momentSchema.index({ userId: 1, createdAt: -1 });

export const Moment = model<IMomentDocument>('Moment', momentSchema);
