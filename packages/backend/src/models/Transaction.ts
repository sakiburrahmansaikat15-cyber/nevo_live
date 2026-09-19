import { Schema, model, Document } from 'mongoose';

export interface ITransactionDocument extends Document {
  userId: Schema.Types.ObjectId;
  type: 'recharge' | 'gift_send' | 'gift_receive' | 'gift_cut' | 'withdraw' | 'coin_sale' | 'agent_recharge' | 'commission' | 'transfer' | 'game_bet' | 'game_win' | 'daily_reward' | 'highlight';
  amount: number;
  currency: 'diamond' | 'coin';
  targetId?: Schema.Types.ObjectId;
  targetModel?: 'Gift' | 'User';
  giftId?: Schema.Types.ObjectId;
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  createdAt: Date;
}

const transactionSchema = new Schema<ITransactionDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['recharge', 'gift_send', 'gift_receive', 'gift_cut', 'withdraw', 'coin_sale', 'agent_recharge', 'commission', 'transfer', 'game_bet', 'game_win', 'daily_reward', 'highlight'],
    required: true,
    index: true,
  },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['diamond', 'coin'], required: true },
  targetId: { type: Schema.Types.ObjectId, refPath: 'targetModel' },
  targetModel: { type: String, enum: ['Gift', 'User'] },
  giftId: { type: Schema.Types.ObjectId, ref: 'Gift' },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  description: { type: String },
  createdAt: { type: Date, default: Date.now, index: true },
});

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });

export const Transaction = model<ITransactionDocument>('Transaction', transactionSchema);
