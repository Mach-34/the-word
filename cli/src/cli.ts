#!/usr/bin/env node --no-warnings
import {
    CircomEngine,
    CircuitInput,
    checkProofPathDir,
    checkProofPath,
    getProof,
    getWasm,
} from "./index.js";
import { ethers } from "ethers";
import figlet from 'figlet';
import { Command, Argument } from "commander";
import chalk from "chalk";
import fs from "fs";

async function main() {
    // log header
    console.log(figlet.textSync('The Word'));

    // commander cli definition
    const program = new Command();
    program
        .version("0.1.0")
        .description("A game to see how big a secret can become before it's too big to keep")

    // create new round command
    program
        .command("create")
        .argument("<phrase>", "The phrase/ word being proven")
        .argument("<key>", "Private key to use for signing transactions")
        .argument("<hint>", "Hint to guessing the secret phrase")
        .description("Create a new round with a secret phrase")
        .action(async (phrase, key) => {
            // check args exist
            if (!phrase || !key) {
                console.log(`${chalk.red("ERROR: ")}must provide a phrase and private key`);
                return;
            }
        });

    // get round information command
    program
        .command("get")
        .argument("<round>", "The round to get information about")
        .description("Get information about a round")
        .action(async (round) => {
            // check args exist
            if (!round) {
                console.log(`${chalk.red("ERROR: ")}must provide a round number`);
                return;
            }
        });
    
    // argument handler
    // todo: more robust argument handling
    program.parseAsync(process.argv);
    if (program.args[0] == "create") {
        await createRound(program.args[1], program.args[2], program.args[3]);
    } else if (program.args[0] == "get") {
        await getRound(program.args[1]);
    }

}


/**
 * Create a new round of TheWord from the cli
 * 
 * @param phrase - the secret phrase to guess
 * @param key - the private key to authorize the onchain action with
 * @param hint - the hint given to help others guess the secret phrase
 */
async function createRound(phrase: string, key: string, hint: string) {
    // get address
    const wallet = new ethers.Wallet(key);
    console.log("=====================================")
    console.log("Creating a new round...")
    console.log(`Secret Phrase: ${chalk.cyan(`"${phrase}"`)}`);
    console.log(`Song hint: ${chalk.cyan(`"${hint}"`)}`);
    console.log(`Sending from: ${chalk.cyan(wallet.address)}`);
    // convert inputted song title to field elements
    if (phrase.length > 180) {
        console.log(`${chalk.red("ERROR: ")} a phrase cannot be more than 180 characters long`);
        return;
    }

    // initialize proving engine
    const engine = await CircomEngine.init();

    // chunk the input
    const input: CircuitInput = { phrase: engine.chunk(phrase) };

    // generate proof
    const { proof, publicSignals } = await engine.prove(input);
    const hash = `0x${BigInt(publicSignals[0]).toString(16)}`;

    // sign message
    const signature = await wallet.signMessage(hash);

    // send to server
    const URL = `${process.env.API!}/create`;
    const res = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message: hash,
            proof,
            signature,
            address: wallet.address,
            hint
        })
    });
    console.log("=====================================")
    if (res.status != 201) {
        console.log(`${chalk.red("ERROR: ")} failed to create new round`);
    } else {
        const body = await res.json();
        console.log(`${chalk.green("SUCCESS: ")} created new round`);
        console.log(`Round number: ${chalk.cyan(body.round)}`);
        console.log(`Tx hash: ${chalk.cyan(body.tx)}`);
    }
    console.log("=====================================")

}

/**
 * Get information about an existing round of TheWord from the cli
 * 
 * @param round - the round to lookup info about 
 */
async function getRound(round: string) {
    // try to parse round number
    try {
        Number(round);
    } catch (error) {
        console.log(`${chalk.red("ERROR: ")} round must be a number`);
        return;
    }

    // retrieve round info from the server
    const URL = `${process.env.API!}/round/${round}`;
    const res = await fetch(URL);
    if (res.status === 404) {
        console.log(`${chalk.red("ERROR: ")} round does not exist`);
        return;
    } else if (res.status !== 200) {
        console.log(`${chalk.red("ERROR: ")} failed to retrieve round info`);
        return;
    } else {
        const data = await res.json();
        console.log(`=====================================`)
        console.log(`Round number: ${chalk.cyan(data.round)}`);
        console.log(`Is Active: ${chalk.cyan(data.active)}`);
        console.log(`Hash of secret: ${chalk.cyan(data.commitment)}`);
        console.log(`Hint: ${chalk.cyan(data.hint)}`);
        console.log(`Number of whispers: ${chalk.cyan(data.numWhispers)}`);
        if (!data.active)
            console.log(`Shouted by: ${chalk.cyan(data.shoutedBy)}`);
        console.log(`=====================================`)
    }
}

main()
    .then(() => { process.exit(0); })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });