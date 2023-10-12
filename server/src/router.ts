import express from 'express';
import { createRound, getRound, whisper, shout } from './controller.js';
const router = express.Router();

// create new game
router.post("/create", createRound);

// get information about a round
router.get("/round/:round", getRound);

// whisper solution to a round
router.post("/whisper", whisper);

// shout solution to a round
router.post("/shout", shout);

export default router;