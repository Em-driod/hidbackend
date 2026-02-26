

import express from 'express';
import { signup, login, verifyOtp, confirmPasswordReset, refreshToken } from '../controllers/authController';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/confirm-password-reset', confirmPasswordReset);
router.post('/refresh-token', refreshToken);

export default router;