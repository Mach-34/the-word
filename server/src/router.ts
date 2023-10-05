import express from 'express';
import { createRound } from './controller.js';
import { verifySignature } from './auth.js';
const router = express.Router();

// create new game
router.post("/create", verifySignature, createRound)

export default router;