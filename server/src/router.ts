import express from 'express';
import {
    createRound,
    getRound,
    whisper,
    shout,
    getRounds,
    getNonce,
    login,
    logout,
    checkProof,
    getWhispers,
    restoreSession,
} from './controller.js';
import { ironSession } from "iron-session/express";
import 'dotenv/config';

declare module "iron-session" {
    interface IronSessionData {
        nonce?: string;
        user?: {
            email: string;
            semaphoreId: string;
        };
    }
}

const session = ironSession(
    {
        cookieName: process.env.SESSION_COOKIE!,
        password: process.env.SESSION_SECRET!,
        cookieOptions: {
            secure: process.env.NODE_ENV === "production",
        }
    }
);

const router = express.Router();

/// AUTH ///

// get a new nonce for watermarking
router.get("/auth/nonce", session, getNonce);

router.post("/auth/login", session, login);

router.post("/auth/logout", session, logout);

router.get("/auth/restore-session", session, restoreSession);

/// THE WORD ///

// create new game
router.post("/create", createRound);

// get information about a round
router.get("/round/:round", getRound);

// get all rounds
router.get("/rounds", session, getRounds);

// get rounds sorted into whispered and not whispered
router.get("/rounds/sorted/:user", session, getWhispers);

// whisper solution to a round
router.post("/whisper", session, whisper);

// shout solution to a round
router.post("/shout", session, shout);

// check a proof without submitting it for whisper/ shouting
router.post("/veirfy", checkProof);

export default router;