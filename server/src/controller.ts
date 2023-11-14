import { Request, Response } from 'express';
import { groth16 } from 'snarkjs';
import { formatRoundData } from './utils.js';
import { buildPoseidon } from 'circomlibjs';
import vkey from "./artifacts/verifier.json" assert { type: "json" };
import { Round, User } from './schema.js';
import { getContract, generateProofAndCommitment, convertTitleToFelts, usernameToBigint } from './utils.js';
import { hexToBigInt, toHexString, getRandomValues } from '@pcd/util';
import { EmailPCDPackage } from '@pcd/email-pcd';

/**
 * Get the nonce for the current watermark
 */
export async function getNonce(req: Request, res: Response) {
    try {
        req.session.nonce = hexToBigInt(
            toHexString(getRandomValues(30))
        ).toString();

        await req.session.save();

        res.status(200).send(req.session.nonce);
    } catch (error) {
        console.error(`[ERROR] ${error}`);
        res.send(500);
    }
}

/**
 * Login with email pcd
 */
export async function login(req: Request, res: Response) {
    try {
        // First ensure that a PCD was provided
        if (!req.body.pcd) {
            console.error(`[ERROR] No pcd provided`);
            res.status(400).send("No pcd provided");
            return;
        }

        // deserialize email pcd
        const pcd = await EmailPCDPackage.deserialize(req.body.pcd);

        // Check that proof matches the claim
        if (!(await EmailPCDPackage.verify(pcd))) {
            console.error(`[ERROR] Email PCD is not valid`);
            res.status(401).send(`Email PCD is not valid`);
            return;
        }

        // Check if user exists in DB and if so then fetch associated username if there is one
        const user = await User.findOne({ semaphoreId: pcd.claim.semaphoreId });

        req.session.user = {
            email: pcd.claim.emailAddress,
            semaphoreId: pcd.claim.semaphoreId,
            username: user?.username
        };
        await req.session.save();
        res.status(200).send({
            email: pcd.claim.emailAddress,
            semaphoreId: pcd.claim.semaphoreId,
            username: user?.username
        })
    } catch (error: any) {
        console.error(`[ERROR] ${error.message}`);
        res.status(500).send(`Unknown error: ${error.message}`);
    }
}

/**
 * Destroy session made from pcd
 */
export async function logout(req: Request, res: Response) {
    req.session.destroy();
    res.status(200).send({ ok: true });
}

/**
 * Create a new round
 * @dev todo: add metatx functionality so a creator can add ether to the prize pool
 */
export async function createRound(req: Request, res: Response) {
    /// DISABLE THIS ENDPOINT UNTIL FURTHER NOTICE ///
    return res.status(403).send("Creation endpoint is currently disabled");
    //////////////////////////////////////////////////
    // message is the commitment to the round secret
    // const { message, username, proof, hint } = req.body;

    // // convert the username into a bigint
    // const usernameEncoded = usernameToBigint(username);

    // // verify the authenticity of the proof
    // const verified = await groth16.verify(vkey, [message, usernameEncoded], proof);
    // if (!verified) {
    //     res.status(400).send("Invalid proof");
    //     return;
    // }

    // // format proof for solidity
    // const formattedProof = formatProof(proof);

    // // post new round onchain
    // // todo: add way to add prizes from api (likely using metatx)
    // const contract = await getContract();
    // const tx = await contract.newRound(message, username, formattedProof);
    // const receipt = await tx.wait();

    // // get round number (arg 0 in only emitted event NewRound)
    // const round = Number(receipt.logs[0].args[0]);

    // // create new round in database
    // await Round.create({ commitment: message, hint, round });

    // return res.status(201).json({
    //     message: "Created round successfully!",
    //     round,
    //     tx: receipt.hash
    // });
}

/**
 * Get information about a given round
 * @todo: method for getting whisperers
 */
export async function getRound(req: Request, res: Response) {
    // get the round being requested
    const { round } = req.params;

    // attempt to retrieve the round from the database
    const roundData = await Round.findOne({ round })
        .populate({
            path: 'whisperers',
            model: 'User',
            select: 'username'
        })
        .populate({
            path: 'shoutedBy',
            model: 'User',
            select: 'username'
        });
    if (!roundData) {
        res.status(404).send("Round does not exist");
        return;
    } else {
        res.status(200).json({
            active: roundData.active,
            commitment: roundData.commitment,
            hint: roundData.hint,
            round: roundData.round,
            prize: roundData.prize,
            secret: roundData.secret,
            shouter: roundData.shoutedBy
                ? (roundData.shoutedBy as any).username
                : undefined,
            whisperers: roundData.whisperers.map((user: any) => user.username),
        });
    }
}

/**
 * Get information about a rounds
 */
export async function getRounds(req: Request, res: Response) {
    const { semaphoreId: userSemaphoreId } = req.session?.user ?? {};
    // attempt to retrieve all rounds from the database
    const roundsData = await Round.find({})
        .populate({
            path: 'whisperers',
            model: 'User',
            select: ['username', 'semaphoreId']
        })
        .populate({
            path: 'shoutedBy',
            model: 'User',
            select: ['username', 'semaphoreId']
        });
    if (!roundsData) {
        res.status(404).send("Round does not exist");
        return;
    } else {
        const formattedRoundsData = roundsData.map(round => {
            const whisperers = round.whisperers.map(({ username }: any) => username);
            const userInteractions = {
                shouted: round.shoutedBy ? !!userSemaphoreId && (round.shoutedBy as any).semaphoreId === userSemaphoreId : false,
                whispered: !!round.whisperers.find(({ semaphoreId }: any) => !!userSemaphoreId && semaphoreId === userSemaphoreId)
            };
            return {
                active: round.active,
                commitment: round.commitment,
                hint: round.hint,
                prize: round.prize,
                round: round.round,
                secret: round.secret,
                shouter: round.shoutedBy
                    ? (round.shoutedBy as any).username
                    : undefined,
                userInteractions,
                whisperers,
            }
        });
        res.status(200).json(formattedRoundsData);
    }
}

/**
 * Get only the secrets a user has whispered. 
 */
export async function getWhispers(req: Request, res: Response) {
    const { round: semaphoreId } = req.params;

    // get the user to look up whispers for
    // if (!req.session.user) {
    //     res.status(401).send("Unauthorized");
    //     return;
    // }
    // const semaphoreId = req.session.user;

    // ensure the user exists
    let user = await User.findOne({ semaphoreId });
    if (!user) {
        res.status(404).send("User does not exist");
        return;
    }

    // get the rounds the user has whispered
    const whisperRounds = await Round.find({ _id: { $in: user.whispers } })
        .populate({
            path: 'whisperers',
            model: 'User',
            select: 'username'
        })
        .populate({
            path: 'shoutedBy',
            model: 'User',
            select: 'username'
        });
    const unknownRounds = await Round.find({ _id: { $nin: user.whispers } })
        .populate({
            path: 'whisperers',
            model: 'User',
            select: 'username'
        })
        .populate({
            path: 'shoutedBy',
            model: 'User',
            select: 'username'
        });
    return res.status(200).json({
        whispered: formatRoundData(whisperRounds),
        unknown: formatRoundData(unknownRounds),
    });
}

/**
 * Restore user session
 */
export async function restoreSession(req: Request, res: Response) {
    if (req.session.user) {
        res.status(200).send(req.session.user);
    } else {
        res.status(200).send({ msg: 'Session not found' })
    }
}

/**
 * Whisper the solution to a round
 */
export async function whisper(req: Request, res: Response) {
    // get round, address, hash, and proof of knowledge of hash preimage
    // get semaphoreId to associate whispers with a zupass identity
    if (!req.session.user) {
        res.status(401).send("Unauthorized");
        return;
    }
    const { proof, round, username } = req.body;
    const { semaphoreId } = req.session.user;

    // attempt to retrieve the round from the database
    const roundData = await Round.findOne({ round })
    // check that round is playable
    if (!roundData) {
        res.status(404).send(`Round ${round} does not exist`);
        return;
    } else if (!roundData.active) {
        res.status(400).send(`Round ${round} is not active`);
        return;
    }

    // get commitment from stored round
    let commitment = roundData.commitment;

    // convert the username into a bigint
    const usernameEncoded = `0x${BigInt(usernameToBigint(username)).toString(16)}`;

    // verify proof of knowledge of secret
    const verified = await groth16.verify(vkey, [commitment, usernameEncoded], proof);
    if (!verified) {
        res.status(400).send("Invalid proof");
        return;
    }
    // attempt to retrieve user or create if none exists
    let user = await User.findOne({ semaphoreId });
    if (!user) {
        user = await User.create({ semaphoreId, username });
    } else {
        // check that user has not already whispered
        if (roundData.whisperers.includes(user._id)) {
            res.status(400).send(`User ${username} has already whispered to round ${round}`);
            return;
        }
    }

    // add whisperer to round
    await Round.updateOne({ round }, { $push: { whisperers: user._id } });

    // add round to user's whispers
    await User.updateOne({ username }, { $push: { whispers: roundData._id } });

    // return success
    res.status(201).json({});
}

/**
 * Checks the validity of a proof without whispering or shouting (used to reissue PCD's)
 */
export async function checkProof(req: Request, res: Response) {
    // get round, address, hash, and proof of knowledge of hash preimage
    const { proof, round, username } = req.body;

    // attempt to retrieve the round from the database
    const roundData = await Round.findOne({ round })

    // check that round is playable
    if (!roundData) {
        res.status(404).send(`Round ${round} does not exist`);
        return;
    } else if (!roundData.active) {
        res.status(400).send(`Round ${round} is not active`);
        return;
    }

    // get commitment from stored round
    let commitment = roundData.commitment;

    // convert the username into a bigint
    const usernameEncoded = `0x${BigInt(usernameToBigint(username)).toString(16)}`;

    // verify proof of knowledge of secret
    const verified = await groth16.verify(vkey, [commitment, usernameEncoded], proof);
    if (verified) {
        res.status(200).send({ ok: true, shouted: !roundData.active });
        return;

    } else {
        res.status(400).send("Invalid proof");
        return;
    }
}

/**
 * Shout the solution to a round
 */
export async function shout(req: Request, res: Response) {
    // get round, address, and secret
    const { round, secret: message, username } = req.body;
    const { semaphoreId } = req.session?.user ?? {};

    // attempt to retrieve the round from the database
    const roundData = await Round.findOne({ round });

    // check that round is playable
    if (!roundData) {
        res.status(404).send(`Round ${round} does not exist`);
        return;
    } else if (!roundData.active) {
        res.status(400).send(`Round ${round} is not active`);
        return;
    }

    // check that the secret is correct
    const poseidon = await buildPoseidon();
    const felts = convertTitleToFelts(message);
    const secret = poseidon.F.toObject(poseidon(felts));
    if (secret !== BigInt(roundData.commitment) as bigint) {
        res.status(400).send(`Invalid secret phrase for round ${round}`);
        return;
    }

    // shout solution in smart contract
    // const contract = await getContract();
    // const tx = await contract.shout(round, message, username);
    // await tx.wait();

    // attempt to retrieve user or create if none exists
    let user = await User.findOne({ semaphoreId });
    if (!user) {
        user = await User.create({ semaphoreId, username });
    }

    // update round in db
    roundData.shoutedBy = user._id;
    roundData.active = false;
    roundData.secret = message;
    await roundData.save();

    // add round to user's shouts
    await User.updateOne({ username }, { $push: { shouts: roundData._id } });

    // return success
    res.status(201).send();
}