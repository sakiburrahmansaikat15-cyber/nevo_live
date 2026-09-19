import client from './client';
import type { ApiResponse, VerificationRequest } from '../types';

export interface SubmitVerificationPayload {
  accountType: 'host' | 'agency';
  fullName: string;
  olaId: string;
  dateOfBirth: string;
  documentType: 'nid' | 'olaid';
  documentFrontUrl: string;
  documentBackUrl: string;
  selfieUrl: string;
}

export const verificationApi = {
  getMyRequest: () =>
    client.get<ApiResponse<VerificationRequest | null>>('/verification/my'),

  submit: (data: SubmitVerificationPayload) =>
    client.post<ApiResponse<VerificationRequest>>('/verification/submit', data),
};
