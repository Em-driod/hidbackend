// src/controllers/userController.ts
import { Request, Response } from 'express';
import db from '../db';
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });



/**
 * Note: We cannot easily extend the Request type in pure CommonJS. 
 * For simplicity, we'll cast req.userId to number, assuming middleware works.
 */

const updateProfile = async (req: Request, res: Response) => {
    const userId = (req as any).userId; // Retrieved from the JWT token via middleware!
    const {
        phoneNumber, dateOfBirth, gender, bloodGroup, address,
        emergencyContacts,
        criticalConditions
    } = req.body;

    if (!userId) {
        return res.status(401).json({ error: 'User not authenticated.' });
    }

    // Input Validation
    if (phoneNumber && typeof phoneNumber !== 'string') {
        return res.status(400).json({ error: 'Phone number must be a string.' });
    }
    if (dateOfBirth && (typeof dateOfBirth !== 'string' || isNaN(Date.parse(dateOfBirth)))) {
        return res.status(400).json({ error: 'Date of birth must be a valid date string.' });
    }
    if (gender && typeof gender !== 'string') {
        return res.status(400).json({ error: 'Gender must be a string.' });
    }
    if (bloodGroup && typeof bloodGroup !== 'string') {
        return res.status(400).json({ error: 'Blood group must be a string.' });
    }
    if (address && typeof address !== 'string') {
        return res.status(400).json({ error: 'Address must be a string.' });
    }

    if (emergencyContacts) {
        if (!Array.isArray(emergencyContacts)) {
            return res.status(400).json({ error: 'Emergency contacts must be an array.' });
        }
        for (const contact of emergencyContacts) {
            if (typeof contact.name !== 'string' || typeof contact.relationship !== 'string' || typeof contact.phoneNumber !== 'string') {
                return res.status(400).json({ error: 'Each emergency contact must have name, relationship, and phoneNumber as strings.' });
            }
        }
    }

    if (criticalConditions) {
        if (!Array.isArray(criticalConditions)) {
            return res.status(400).json({ error: 'Critical conditions must be an array.' });
        }
        for (const conditionName of criticalConditions) {
            if (typeof conditionName !== 'string') {
                return res.status(400).json({ error: 'Each critical condition must be a string.' });
            }
        }
    }

    try {
        await db.query('BEGIN');

        // 1. Update users table (for phone number, if provided)
        if (phoneNumber) {
            await db.query(
                'UPDATE users SET phone_number = $1 WHERE user_id = $2',
                [phoneNumber, userId]
            );
        }

        // 2. Update user_profiles table
        const profileUpdateQuery = `
            UPDATE user_profiles
            SET date_of_birth = COALESCE($1, date_of_birth),
                gender = COALESCE($2, gender),
                blood_group = COALESCE($3, blood_group),
                address = COALESCE($4, address)
            WHERE user_id = $5
        `;
        await db.query(profileUpdateQuery, [dateOfBirth, gender, bloodGroup, address, userId]);

        // 3. Update Emergency Contacts (Feature 5)
        if (emergencyContacts && Array.isArray(emergencyContacts)) {
            await db.query('DELETE FROM emergency_contacts WHERE user_id = $1', [userId]);

            for (const contact of emergencyContacts) {
                await db.query(
                    `INSERT INTO emergency_contacts (user_id, name, relationship, phone_number, is_next_of_kin)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [userId, contact.name, contact.relationship, contact.phoneNumber, contact.isNextOfKin || false]
                );
            }
        }

        // 4. Update Critical Conditions (Feature 5)
        if (criticalConditions && Array.isArray(criticalConditions)) {
            await db.query('UPDATE chronic_conditions SET is_critical = FALSE WHERE user_id = $1', [userId]);

            for (const conditionName of criticalConditions) {
                await db.query(
                    `INSERT INTO chronic_conditions (user_id, condition_name, is_critical)
                     VALUES ($1, $2, TRUE)
                     ON CONFLICT (user_id, condition_name)
                     DO UPDATE SET is_critical = TRUE, last_updated_at = NOW()`,
                    [userId, conditionName]
                );
            }
        }

        await db.query('COMMIT');

        res.status(200).json({ message: 'User profile and emergency information updated successfully.' });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile due to a server error.' });
    }
};
export {
    updateProfile
};