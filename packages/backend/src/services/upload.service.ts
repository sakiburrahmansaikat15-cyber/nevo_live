import cloudinary from '../config/cloudinary';
import { AppError } from '../middleware/errorHandler';

export const uploadService = {
  async uploadImage(filePath: string, folder: string = 'bogolive'): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'image',
      });
      return result.secure_url;
    } catch (error) {
      throw new AppError('Failed to upload image', 500);
    }
  },

  async uploadVideo(filePath: string, folder: string = 'bogolive'): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'video',
        eager: [{ streaming_profile: 'hd' }],
      });
      return result.secure_url;
    } catch (error) {
      throw new AppError('Failed to upload video', 500);
    }
  },

  async uploadAudio(filePath: string, folder: string = 'bogolive'): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'video', // Cloudinary treats audio as 'video' resource type
      });
      return result.secure_url;
    } catch (error) {
      throw new AppError('Failed to upload audio', 500);
    }
  },

  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Failed to delete file from Cloudinary:', error);
    }
  },

  getPublicIdFromUrl(url: string): string {
    // Extract public ID from Cloudinary URL
    const parts = url.split('/');
    const fileWithExt = parts[parts.length - 1];
    const folder = parts[parts.length - 2];
    const publicId = `${folder}/${fileWithExt.split('.')[0]}`;
    return publicId;
  },
};
