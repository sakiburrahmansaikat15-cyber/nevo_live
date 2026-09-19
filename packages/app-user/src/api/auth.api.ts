import client from './client';
import type { ApiResponse } from '../types';

export const authApi = {
  sendOtp: (phone: string) =>
    client.post<ApiResponse>('/auth/send-otp', { phone }),

  verifyOtp: (phone: string, code: string, idToken: string) =>
    client.post<ApiResponse<{ token: string; user: any }>>('/auth/verify-otp', {
      phone,
      code,
      idToken,
    }),

  passwordLogin: (phone: string, password: string) =>
    client.post<ApiResponse<{ token: string; user: any }>>('/auth/login', {
      phone,
      password,
    }),

  googleLogin: (idToken: string) =>
    client.post<ApiResponse<{ token: string; user: any }>>('/auth/google', {
      idToken,
    }),

  register: (phone: string, nickname: string, password?: string) =>
    client.post<ApiResponse<{ token: string; user: any }>>('/auth/register', {
      phone,
      nickname,
      password,
    }),

  devLogin: (phone: string, nickname?: string) =>
    client.post<ApiResponse<{ token: string; user: any }>>('/auth/dev', {
      phone,
      nickname,
    }),

  resetPassword: (phone: string, idToken: string, newPassword: string) =>
    client.post<ApiResponse>('/auth/reset-password', {
      phone,
      idToken,
      newPassword,
    }),
};
