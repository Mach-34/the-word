import express, { Request, Response } from 'express';
import { groth16, Groth16Proof } from 'snarkjs';
import vkey from "./artifacts/verifier.json" assert { type: "json" };
import { Round } from './schema.js';
import { getContract, formatProof } from './utils.js';

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
            hint: roundData.hint,
            prize: roundData.prize,
            numWhispers: roundData.whisperers.length,
            shouter: roundData.shoutedBy,
            active: roundData.active
        });
    }
}