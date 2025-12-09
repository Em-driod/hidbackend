// src/controllers/authController.ts



import { Request, Response } from 'express';
import db from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const SALT_ROUNDS = 10;

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = '7d';

if (!JWT_SECRET) {
    throw new Error('FATAL ERROR: JWT_SECRET is not defined.');
}
const HEALTH_ID_PREFIX = 'HID-';

// Helper to generate user HEALTH ID
const generateHealthID = () => `${HEALTH_ID_PREFIX}${uuidv4()}`;

// -----------------------------------------------------
// SIGNUP CONTROLLER
// -----------------------------------------------------
const signup = async (req: Request, res: Response) => {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: 'All fields (email, password, firstName, lastName) are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        await db.query('BEGIN');

        const userResult = await db.query(
            'INSERT INTO users(email, password_hash) VALUES($1, $2) RETURNING user_id',
            [email, passwordHash]
        );
        const userId = userResult.rows[0].user_id;

        await db.query(
            'INSERT INTO user_profiles(user_id, first_name, last_name) VALUES($1, $2, $3)',
            [userId, firstName, lastName]
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

        const token = jwt.sign(
            { userId: user.user_id, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRATION }
        );

        return res.status(200).json({ token, userId: user.user_id });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Server error during login.' });
    }
};

export { signup, login };
