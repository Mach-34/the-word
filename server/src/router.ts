import express from 'express';
import { createRound, getRound } from './controller.js';
import { verifySignature } from './auth.js';
const router = express.Router();

// create new game
router.post("/create", verifySignature, createRound);

// get information about a round
router.get("/round/:round", getRound);

export default router;