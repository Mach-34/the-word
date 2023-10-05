import express from 'express';
import { createRound, getRound, whisper, shout } from './controller.js';
import { verifySignature } from './auth.js';
const router = express.Router();

// create new game
router.post("/create", verifySignature, createRound);

// get information about a round
router.get("/round/:round", getRound);

// whisper solution to a round
router.post("/whisper", verifySignature, whisper);

// shout solution to a round
router.post("/shout", verifySignature, shout);

export default router;