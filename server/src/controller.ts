import { Request, Response } from 'express';
import { groth16 } from 'snarkjs';
import { buildPoseidon } from 'circomlibjs';
import vkey from "./artifacts/verifier.json" assert { type: "json" };
import { Round, User } from './schema.js';
import { getContract, generateProofAndCommitment, convertTitleToFelts, usernameToBigint } from './utils.js';
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
            round: roundData.round,
            commitment: roundData.commitment,
            secret: roundData.secret,
            hint: roundData.hint,
            prize: roundData.prize,
            whisperers: roundData.whisperers.map((user: any) => user.username),
            shouter: roundData.shoutedBy
                ? (roundData.shoutedBy as any).username
                : undefined,
            active: roundData.active
        });
    }
}

/**
 * Get information about a all round rounds
 */
export async function getRounds(req: Request, res: Response) {
    // attempt to retrieve all rounds from the database
    const roundsData = await Round.find({})
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
    if (!roundsData) {
        res.status(404).send("Round does not exist");
        return;
    } else {
        const formattedRoundsData = roundsData.map(round => ({
            round: round.round,
            // TODO: commitment: round.commitment
            // TODO: secret: round.secret
            hint: round.hint,
            prize: round.prize,
            // @ts-ignore
            whisperers: round.whisperers.map((whisperer) => whisperer.username),
            shouter: round.shoutedBy
                ? (round.shoutedBy as any).username
                : undefined,
            active: round.active

        }));
        res.status(200).json(formattedRoundsData);
    }
}

/**
 * Whisper the solution to a round
 */
export async function whisper(req: Request, res: Response) {
    // get round, address, hash, and proof of knowledge of hash preimage
    const { username, secret, round } = req.body;

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

    // TODO: Generate proof on frontend
    const { proof } = await generateProofAndCommitment(secret, usernameEncoded);

    // verify proof of knowledge of secret
    const verified = await groth16.verify(vkey, [commitment, usernameEncoded], proof);
    if (!verified) {
        res.status(400).send("Invalid proof");
        return;
    }

    // attempt to retrieve user or create if none exists
    let user = await User.findOne({ username });
    if (!user) {
        user = await User.create({ username });
    }

    // add whisperer to round
    await Round.updateOne({ round }, { $push: { whisperers: user._id } });

    // add round to user's whispers
    await User.updateOne({ username }, { $push: { whispers: roundData._id } });

    // return success
    res.status(201).json({});
}

/**
 * Shout the solution to a round
 */
export async function shout(req: Request, res: Response) {
    // get round, address, and secret
    const { round, secret: message, username } = req.body;

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
    let user = await User.findOne({ username });
    if (!user) {
        user = await User.create({ username });
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