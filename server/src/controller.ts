import { Request, Response } from 'express';
import { groth16 } from 'snarkjs';
import { buildPoseidon } from 'circomlibjs';
import vkey from "./artifacts/verifier.json" assert { type: "json" };
import { Round, User } from './schema.js';
import { getContract, formatProof, convertTitleToFelts } from './utils.js';

/**
 * Create a new round
 * @dev todo: add metatx functionality so a creator can add ether to the prize pool
 */
export async function createRound(req: Request, res: Response) {
    // message is the commitment to the round secret
    const { message, proof, hint } = req.body;

    // verify the authenticity of the proof
    const verified = await groth16.verify(vkey, [message], proof);
    if (!verified) {
        res.status(400).send("Invalid proof");
        return;
    }

    // format proof for solidity
    const formattedProof = formatProof(proof);

    // post new round onchain
    // todo: add way to add prizes from api (likely using metatx)
    const contract = await getContract();
    const tx = await contract.newRound(message, formattedProof);
    const receipt = await tx.wait();

    // get round number (arg 0 in only emitted event NewRound)
    const round = Number(receipt.logs[0].args[0]);

    // create new round in database
    await Round.create({ commitment: message, hint, round });
    return res.status(201).json({
        message: "Created round successfully!",
        round,
        tx: receipt.hash
    });
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
            select: 'pubkey'
        })
        .populate({
            path: 'shoutedBy',
            model: 'User',
            select: 'pubkey'
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
            numWhispers: roundData.whisperers.length,
            shouter: roundData.shoutedBy ? (roundData.shoutedBy as any).pubkey : undefined,
            active: roundData.active
        });
    }
}

/**
 * Whisper the solution to a round
 */
export async function whisper(req: Request, res: Response) {
    // get round, address, hash, and proof of knowledge of hash preimage
    const { message, proof, round, address } = req.body;

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

    // verify proof of knowledge of secret
    const verified = await groth16.verify(vkey, [message], proof);
    if (!verified) {
        res.status(400).send("Invalid proof");
        return;
    }

    // attempt to retrieve user or create if none exists
    let user = await User.findOne({ pubkey: address });
    if (!user) {
        user = await User.create({ pubkey: address });
    }

    // add whisperer to round
    await Round.updateOne({ round }, { $push: { whisperers: user._id } });

    // add round to user's whispers
    await User.updateOne({ pubkey: address }, { $push: { whispers: roundData._id } });

    // return success
    res.status(201).json({});
}

/**
 * Shout the solution to a round
 */
export async function shout(req: Request, res: Response) {
    // get round, address, and secret
    const { round, address, message } = req.body;

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
    const contract = await getContract();
    const tx = await contract.shout(round, message, address);
    await tx.wait();

    // attempt to retrieve user or create if none exists
    let user = await User.findOne({ pubkey: address });
    if (!user) {
        user = await User.create({ pubkey: address });
    }

    // update round in db
    roundData.shoutedBy = user._id;
    roundData.active = false;
    roundData.secret = message;
    console.log("Round Data", roundData);
    await roundData.save();

    // add round to user's shouts
    await User.updateOne({ pubkey: address }, { $push: { shouts: roundData._id } });

    // return success
    res.status(201).send();
}