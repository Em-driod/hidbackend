

import express from 'express';
import { signup, login, sendOtp, verifyOtp, confirmPasswordReset, refreshToken } from '../controllers/authController';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/confirm-password-reset', confirmPasswordReset);
router.post('/refresh-token', refreshToken);

export default router;