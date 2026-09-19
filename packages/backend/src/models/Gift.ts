import { Schema, model, Document } from 'mongoose';

export interface IGiftDocument extends Document {
  giftId: string;
  name: string;
  icon: string;
  priceDiamonds: number;
  animation?: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const giftSchema = new Schema<IGiftDocument>(
  {
    giftId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    icon: { type: String, required: true },
    priceDiamonds: { type: Number, required: true, min: 1 },
    animation: { type: String },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

giftSchema.index({ isActive: 1, order: 1 });

export const Gift = model<IGiftDocument>('Gift', giftSchema);
