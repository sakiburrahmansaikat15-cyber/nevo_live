import { Schema, model, Document } from 'mongoose';

export interface ISeat {
  index: number;
  userId?: Schema.Types.ObjectId;
  isLocked: boolean;
}

export interface IRoomDocument extends Document {
  ownerId: Schema.Types.ObjectId;
  name: string;
  description: string;
  seats: ISeat[];
  isPrivate: boolean;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoomDocument>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    seats: [
      {
        index: { type: Number, required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        isLocked: { type: Boolean, default: false },
      },
    ],
    isPrivate: { type: Boolean, default: false },
    password: { type: String, select: false },
  },
  { timestamps: true }
);

roomSchema.index({ isPrivate: 1 });

export const Room = model<IRoomDocument>('Room', roomSchema);
