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
    const userId = (req as any).userId;
    const {
        aboutMe,
        healthInfo,
        emergencyContact,
        medicalNotes
    } = req.body;

    if (!userId) {
        return res.status(401).json({ error: 'User not authenticated.' });
    }

    // Input Validation
    if (aboutMe) {
        if (aboutMe.fullName && typeof aboutMe.fullName !== 'string') {
            return res.status(400).json({ error: 'Full name must be a string.' });
        }
        if (aboutMe.dateOfBirth && (typeof aboutMe.dateOfBirth !== 'string' || isNaN(Date.parse(aboutMe.dateOfBirth)))) {
            return res.status(400).json({ error: 'Date of birth must be a valid date string.' });
        }
        if (aboutMe.gender && !['male', 'female', 'other'].includes(aboutMe.gender)) {
            return res.status(400).json({ error: 'Gender must be male, female, or other.' });
        }
        if (aboutMe.country && typeof aboutMe.country !== 'string') {
            return res.status(400).json({ error: 'Country must be a string.' });
        }
        if (aboutMe.state && typeof aboutMe.state !== 'string') {
            return res.status(400).json({ error: 'State must be a string.' });
        }
    }

    if (healthInfo) {
        if (healthInfo.bloodGroup && typeof healthInfo.bloodGroup !== 'string') {
            return res.status(400).json({ error: 'Blood group must be a string.' });
        }
        if (healthInfo.genotype && typeof healthInfo.genotype !== 'string') {
            return res.status(400).json({ error: 'Genotype must be a string.' });
        }
        if (healthInfo.allergies && !Array.isArray(healthInfo.allergies)) {
            return res.status(400).json({ error: 'Allergies must be an array.' });
        }
        if (healthInfo.chronicConditions && !Array.isArray(healthInfo.chronicConditions)) {
            return res.status(400).json({ error: 'Chronic conditions must be an array.' });
        }
        if (healthInfo.currentMedications && !Array.isArray(healthInfo.currentMedications)) {
            return res.status(400).json({ error: 'Current medications must be an array.' });
        }
    }

    if (emergencyContact) {
        if (emergencyContact.fullName && typeof emergencyContact.fullName !== 'string') {
            return res.status(400).json({ error: 'Emergency contact full name must be a string.' });
        }
        if (emergencyContact.relationship && typeof emergencyContact.relationship !== 'string') {
            return res.status(400).json({ error: 'Emergency contact relationship must be a string.' });
        }
        if (emergencyContact.phoneNumber && typeof emergencyContact.phoneNumber !== 'string') {
            return res.status(400).json({ error: 'Emergency contact phone number must be a string.' });
        }
        if (emergencyContact.address && typeof emergencyContact.address !== 'string') {
            return res.status(400).json({ error: 'Emergency contact address must be a string.' });
        }
    }

    if (medicalNotes && typeof medicalNotes !== 'string') {
        return res.status(400).json({ error: 'Medical notes must be a string.' });
    }

    try {
        await db.query('BEGIN');

        // 1. Update user_profiles table with aboutMe information
        if (aboutMe) {
            const profileUpdateQuery = `
                UPDATE user_profiles
                SET first_name = COALESCE($1, first_name),
                    last_name = COALESCE($2, last_name),
                    date_of_birth = COALESCE($3, date_of_birth),
                    gender = COALESCE($4, gender),
                    country = COALESCE($5, country),
                    state = COALESCE($6, state)
                WHERE user_id = $7
            `;
            
            const nameParts = aboutMe.fullName ? aboutMe.fullName.split(' ') : [];
            const firstName = nameParts[0] || null;
            const lastName = nameParts.slice(1).join(' ') || null;
            
            await db.query(profileUpdateQuery, [
                firstName,
                lastName,
                aboutMe.dateOfBirth || null,
                aboutMe.gender || null,
                aboutMe.country || null,
                aboutMe.state || null,
                userId
            ]);
        }

        // 2. Update health information
        if (healthInfo) {
            const healthUpdateQuery = `
                UPDATE user_profiles
                SET blood_group = COALESCE($1, blood_group),
                    genotype = COALESCE($2, genotype)
                WHERE user_id = $3
            `;
            await db.query(healthUpdateQuery, [
                healthInfo.bloodGroup || null,
                healthInfo.genotype || null,
                userId
            ]);

            // Update allergies
            if (healthInfo.allergies && Array.isArray(healthInfo.allergies)) {
                await db.query('DELETE FROM allergies WHERE user_id = $1', [userId]);
                for (const allergy of healthInfo.allergies) {
                    await db.query(
                        'INSERT INTO allergies (user_id, allergy_name) VALUES ($1, $2)',
                        [userId, allergy]
                    );
                }
            }

            // Update chronic conditions
            if (healthInfo.chronicConditions && Array.isArray(healthInfo.chronicConditions)) {
                await db.query('DELETE FROM chronic_conditions WHERE user_id = $1', [userId]);
                for (const condition of healthInfo.chronicConditions) {
                    await db.query(
                        'INSERT INTO chronic_conditions (user_id, condition_name, is_critical) VALUES ($1, $2, FALSE)',
                        [userId, condition]
                    );
                }
            }

            // Update current medications
            if (healthInfo.currentMedications && Array.isArray(healthInfo.currentMedications)) {
                await db.query('DELETE FROM current_medications WHERE user_id = $1', [userId]);
                for (const medication of healthInfo.currentMedications) {
                    await db.query(
                        'INSERT INTO current_medications (user_id, medication_name) VALUES ($1, $2)',
                        [userId, medication]
                    );
                }
            }
        }

        // 3. Update emergency contact
        if (emergencyContact) {
            await db.query('DELETE FROM emergency_contacts WHERE user_id = $1', [userId]);
            await db.query(
                `INSERT INTO emergency_contacts (user_id, name, relationship, phone_number, address, is_next_of_kin)
                 VALUES ($1, $2, $3, $4, $5, TRUE)`,
                [userId, emergencyContact.fullName, emergencyContact.relationship, emergencyContact.phoneNumber, emergencyContact.address]
            );
        }

        // 4. Update medical notes
        if (medicalNotes) {
            await db.query(
                'UPDATE user_profiles SET medical_notes = $1 WHERE user_id = $2',
                [medicalNotes, userId]
            );
        }

        await db.query('COMMIT');

        res.status(200).json({ message: 'User profile updated successfully.' });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile due to a server error.' });
    }
};
export {
    updateProfile
};