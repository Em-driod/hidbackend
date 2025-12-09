// src/controllers/medicalDataController.ts
import { Request, Response } from 'express';
import db from '../db';
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });


// --- ALLERGIES CRUD (Feature 11) ---

const createAllergy = async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { allergenName, category, reaction, severity } = req.body;

    if (!userId || !allergenName || !category) {
        return res.status(400).json({ error: 'Missing required fields: allergenName and category.' });
    }

    try {
        const result = await db.query(
            `INSERT INTO allergies (user_id, allergen_name, category, reaction, severity) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING allergy_id, allergen_name`,
            [userId, allergenName, category, reaction, severity]
        );
        res.status(201).json({
            message: 'Allergy created successfully.',
            allergy: result.rows[0]
        });
    } catch (error: any) {
        console.error('Create allergy error:', error);
        // Catch PostgreSQL unique violation if user tries to add the same allergy twice
        if (error.code === '23505') {
            return res.status(409).json({ error: 'This allergy already exists for your profile.' });
        }
        res.status(500).json({ error: 'Server error creating allergy.' });
    }
};

const getAllAllergies = async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    try {
        const result = await db.query(
            `SELECT allergy_id, allergen_name, category, reaction, severity, is_verified 
             FROM allergies WHERE user_id = $1 ORDER BY category, allergen_name`,
            [userId]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Get allergies error:', error);
        res.status(500).json({ error: 'Server error retrieving allergies.' });
    }
};

const deleteAllergy = async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { allergyId } = req.params;

    try {
        const result = await db.query(
            'DELETE FROM allergies WHERE user_id = $1 AND allergy_id = $2 RETURNING allergy_id',
            [userId, allergyId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Allergy not found or does not belong to user.' });
        }
        res.status(200).json({ message: 'Allergy deleted successfully.' });
    } catch (error) {
        console.error('Delete allergy error:', error);
        res.status(500).json({ error: 'Server error deleting allergy.' });
    }
};

// --- CHRONIC CONDITIONS CRUD (Feature 11) ---

const createCondition = async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { conditionName, diagnosisDate, status, isCritical } = req.body;

    if (!userId || !conditionName) {
        return res.status(400).json({ error: 'Missing required field: conditionName.' });
    }

    try {
        const result = await db.query(
            `INSERT INTO chronic_conditions (user_id, condition_name, diagnosis_date, status, is_critical) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING condition_id, condition_name`,
            [userId, conditionName, diagnosisDate, status || 'Active', isCritical || false]
        );
        res.status(201).json({
            message: 'Condition created successfully.',
            condition: result.rows[0]
        });
    } catch (error: any) {
        console.error('Create condition error:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'This condition already exists for your profile.' });
        }
        res.status(500).json({ error: 'Server error creating condition.' });
    }
};

const getAllConditions = async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    try {
        const result = await db.query(
            `SELECT condition_id, condition_name, diagnosis_date, status, is_critical 
             FROM chronic_conditions WHERE user_id = $1 ORDER BY is_critical DESC, condition_name`,
            [userId]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Get conditions error:', error);
        res.status(500).json({ error: 'Server error retrieving conditions.' });
    }
};

// ... (Add updateCondition and deleteCondition logic here later) ...

export {
    createAllergy,
    getAllAllergies,
    deleteAllergy,
    createCondition,
    getAllConditions,
    // ... export other functions
};