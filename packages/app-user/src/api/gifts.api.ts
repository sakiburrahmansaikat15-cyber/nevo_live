import client from './client';
import type { ApiResponse, Gift } from '../types';

export interface SendGiftResult {
  senderBalance: number;
  receiverEarned: number;
  totalCost: number;
}

export const giftsApi = {
  list: () =>
    client.get<ApiResponse<Gift[]>>('/gifts'),

  send: (receiverId: string, giftId: string, quantity = 1) =>
    client.post<ApiResponse<SendGiftResult>>('/gifts/send', { receiverId, giftId, quantity }),
};
