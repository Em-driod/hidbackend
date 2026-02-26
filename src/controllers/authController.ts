// src/controllers/authController.ts

import { Request, Response } from 'express';
import db from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';

const SALT_ROUNDS = 10;

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = '7d';
const REFRESH_TOKEN_EXPIRATION = '30d';

if (!JWT_SECRET) {
    throw new Error('FATAL ERROR: JWT_SECRET is not defined.');
}
const HEALTH_ID_PREFIX = 'HID-';

// Email transporter setup
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Helper to generate user HEALTH ID
const generateHealthID = () => `${HEALTH_ID_PREFIX}${uuidv4()}`;

// -----------------------------------------------------
// SIGNUP CONTROLLER
// -----------------------------------------------------
const signup = async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, phoneNumber, gender } = req.body;

    if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: 'All fields (email, password, firstName, lastName) are required.' });
    }

    if (gender && !['male', 'female', 'other'].includes(gender)) {
        return res.status(400).json({ error: 'Gender must be male, female, or other.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        await db.query('BEGIN');

        const userResult = await db.query(
            'INSERT INTO users(email, password_hash, phone_number) VALUES($1, $2, $3) RETURNING user_id',
            [email, passwordHash, phoneNumber || null]
        );
        const userId = userResult.rows[0].user_id;

        await db.query(
            'INSERT INTO user_profiles(user_id, first_name, last_name, gender) VALUES($1, $2, $3, $4)',
            [userId, firstName, lastName, gender || null]
        );

        const healthId = generateHealthID();

        await db.query(
            'INSERT INTO health_ids(user_id, health_id) VALUES($1, $2)',
            [userId, healthId]
        );

        await db.query('COMMIT');

        return res.status(201).json({
            message: 'User successfully registered.',
            user: { userId, email, healthId }
        });

    } catch (error: any) {
        await db.query('ROLLBACK');
        console.error('Signup error:', error);

        if (error.code === '23505') {
            return res.status(409).json({ error: 'Email address is already in use.' });
        }
        return res.status(500).json({ error: 'Server error during registration.' });
    }
};

// -----------------------------------------------------
// LOGIN CONTROLLER
// -----------------------------------------------------
const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Both email and password are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
    }

    try {
        const userResult = await db.query(
            'SELECT user_id, email, password_hash FROM users WHERE email = $1',
            [email]
        );

        const user = userResult.rows[0];

        if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials.' });

        if (!JWT_SECRET) {
            return res.status(500).json({ error: 'Server is missing JWT_SECRET. Contact admin.' });
        }

        const accessToken = jwt.sign(
            { userId: user.user_id, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRATION }
        );

        const refreshToken = jwt.sign(
            { userId: user.user_id, email: user.email },
            JWT_SECRET,
            { expiresIn: REFRESH_TOKEN_EXPIRATION }
        );

        return res.status(200).json({
            userId: user.user_id,
            accessToken,
            refreshToken
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Server error during login.' });
    }
};

// -----------------------------------------------------
// SEND OTP CONTROLLER
// -----------------------------------------------------
const sendOtp = async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
    }

    try {
        // Check if user exists
        const userResult = await db.query(
            'SELECT user_id FROM users WHERE email = $1',
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'No account found with this email.' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Delete any existing OTPs for this email
        await db.query('DELETE FROM otp_verification WHERE email = $1', [email]);

        // Store new OTP
        await db.query(
            'INSERT INTO otp_verification (email, otp, expires_at) VALUES ($1, $2, $3)',
            [email, otp, expiresAt]
        );

        // Send OTP via email
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Your OTP Code - Health ID',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Health ID - OTP Verification</h2>
                        <p>Your One-Time Password (OTP) is:</p>
                        <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                            <span style="font-size: 32px; font-weight: bold; color: #007bff;">${otp}</span>
                        </div>
                        <p>This OTP will expire in 10 minutes.</p>
                        <p style="color: #666; font-size: 14px;">If you didn't request this OTP, please ignore this email.</p>
                    </div>
                `,
            });
        } catch (emailError) {
            console.error('Failed to send email:', emailError);
            // Fallback: return OTP in development
            if (process.env.NODE_ENV === 'development') {
                console.log(`OTP for ${email}: ${otp}`);
            }
        }

        return res.status(200).json({ 
            message: 'OTP sent successfully to your email.',
            // Remove otp in production, only for development
            otp: process.env.NODE_ENV === 'development' ? otp : undefined
        });

    } catch (error) {
        console.error('Send OTP error:', error);
        return res.status(500).json({ error: 'Server error sending OTP.' });
    }
};

// -----------------------------------------------------
// VERIFY OTP CONTROLLER
// -----------------------------------------------------
const verifyOtp = async (req: Request, res: Response) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
    }

    try {
        const otpResult = await db.query(
            'SELECT user_id, otp, expires_at FROM otp_verification WHERE email = $1 ORDER BY created_at DESC LIMIT 1',
            [email]
        );

        if (otpResult.rows.length === 0) {
            return res.status(400).json({ error: 'No OTP found for this email.' });
        }

        const otpRecord = otpResult.rows[0];

        if (new Date() > new Date(otpRecord.expires_at)) {
            return res.status(400).json({ error: 'OTP has expired.' });
        }

        if (otpRecord.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP.' });
        }

        await db.query('DELETE FROM otp_verification WHERE email = $1', [email]);

        return res.status(200).json({ message: 'OTP verified successfully.' });

    } catch (error) {
        console.error('OTP verification error:', error);
        return res.status(500).json({ error: 'Server error during OTP verification.' });
    }
};

// -----------------------------------------------------
// CONFIRM PASSWORD RESET CONTROLLER
// -----------------------------------------------------
const confirmPasswordReset = async (req: Request, res: Response) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
    }

    try {
        const otpResult = await db.query(
            'SELECT user_id, otp, expires_at FROM otp_verification WHERE email = $1 ORDER BY created_at DESC LIMIT 1',
            [email]
        );

        if (otpResult.rows.length === 0) {
            return res.status(400).json({ error: 'No OTP found for this email.' });
        }

        const otpRecord = otpResult.rows[0];

        if (new Date() > new Date(otpRecord.expires_at)) {
            return res.status(400).json({ error: 'OTP has expired.' });
        }

        if (otpRecord.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP.' });
        }

        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        await db.query('BEGIN');

        await db.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2',
            [passwordHash, email]
        );

        await db.query('DELETE FROM otp_verification WHERE email = $1', [email]);

        await db.query('COMMIT');

        return res.status(200).json({ message: 'Password reset successfully.' });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Password reset error:', error);
        return res.status(500).json({ error: 'Server error during password reset.' });
    }
};

// -----------------------------------------------------
// REFRESH TOKEN CONTROLLER
// -----------------------------------------------------
const refreshToken = async (req: Request, res: Response) => {
    const { refreshToken: token } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Refresh token is required.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
        const userResult = await db.query(
            'SELECT user_id, email FROM users WHERE user_id = $1',
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid refresh token.' });
        }

        const user = userResult.rows[0];

        const newAccessToken = jwt.sign(
            { userId: user.user_id, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRATION }
        );

        const newRefreshToken = jwt.sign(
            { userId: user.user_id, email: user.email },
            JWT_SECRET,
            { expiresIn: REFRESH_TOKEN_EXPIRATION }
        );

        return res.status(200).json({
            userId: user.user_id,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });

    } catch (error) {
        console.error('Refresh token error:', error);
        return res.status(401).json({ error: 'Invalid refresh token.' });
    }
};

export { signup, login, sendOtp, verifyOtp, confirmPasswordReset, refreshToken };
