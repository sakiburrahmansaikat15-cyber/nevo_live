import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess, sendError } from '../utils/response';

export const authController = {
  async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.sendOtp(req.body.phone);
      sendSuccess(res, null, 'OTP sent successfully');
    } catch (error) {
      next(error);
    }
  },

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, code, idToken } = req.body;
      const result = await authService.verifyOtpAndLogin(phone, code, idToken);
      sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  },

  async passwordLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, password } = req.body;
      const result = await authService.loginWithPassword(phone, password);
      sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  },

  async googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { idToken } = req.body;
      const result = await authService.loginWithGoogle(idToken);
      sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  },

  async devLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, nickname } = req.body;
      const result = await authService.devLogin(phone, nickname);
      sendSuccess(res, result, 'Dev login successful');
    } catch (error) {
      next(error);
    }
  },

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, nickname, password } = req.body;
      const result = await authService.register(phone, nickname, password);
      sendSuccess(res, result, 'Registration successful', 201);
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, idToken, newPassword } = req.body;
      const result = await authService.resetPassword(phone, idToken, newPassword);
      sendSuccess(res, result, 'Password updated successfully');
    } catch (error) {
      next(error);
    }
  },
};
