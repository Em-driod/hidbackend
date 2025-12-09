


import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import * as medicalDataController from '../controllers/medicalDataController';

const router = express.Router();

// All routes here are protected by the JWT middleware
router.use(authenticateToken);

// --- Allergies Routes ---
// POST /api/medical/allergies - Create allergy
router.post('/allergies', medicalDataController.createAllergy);

// GET /api/medical/allergies - Read all allergies
router.get('/allergies', medicalDataController.getAllAllergies);

// DELETE /api/medical/allergies/:allergyId - Delete specific allergy
router.delete('/allergies/:allergyId', medicalDataController.deleteAllergy);

// --- Chronic Conditions Routes ---
// POST /api/medical/conditions - Create condition
router.post('/conditions', medicalDataController.createCondition);

// GET /api/medical/conditions - Read all conditions
router.get('/conditions', medicalDataController.getAllConditions);

export default router;