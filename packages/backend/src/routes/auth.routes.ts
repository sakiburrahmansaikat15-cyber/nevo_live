import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { sendOtpSchema, verifyOtpSchema, passwordLoginSchema, googleLoginSchema, registerSchema } from '@bogolive/shared';

const router = Router();

router.post('/send-otp', validate(sendOtpSchema), authController.sendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/login', validate(passwordLoginSchema), authController.passwordLogin);
router.post('/google', validate(googleLoginSchema), authController.googleLogin);
router.post('/register', validate(registerSchema), authController.register);
router.post('/reset-password', authController.resetPassword);
router.post('/dev', authController.devLogin);

export default router;
