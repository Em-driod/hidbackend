// src/routes/userRoutes.ts

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware'; // Get middleware
import { updateProfile } from '../controllers/userController'; 

const router = express.Router();

// Route to update profile and emergency info (Feature 4 & 5)
// This route is PROTECTED by the authenticateToken middleware
router.put('/profile', authenticateToken, updateProfile);

export default router;