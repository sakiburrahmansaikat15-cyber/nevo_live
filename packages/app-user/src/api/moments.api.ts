import client from './client';
import type { ApiResponse, Moment } from '../types';

export const momentsApi = {
  getFeed: (page = 1) =>
    client.get<ApiResponse<Moment[]>>('/moments', { params: { page } }),

  create: (data: { content?: string; media?: string[] }) =>
    client.post<ApiResponse<Moment>>('/moments', data),

  delete: (id: string) =>
    client.delete(`/moments/${id}`),

  toggleLike: (id: string) =>
    client.post<ApiResponse<{ liked: boolean }>>(`/moments/${id}/like`),

  addComment: (id: string, text: string) =>
    client.post<ApiResponse>(`/moments/${id}/comment`, { text }),
};
