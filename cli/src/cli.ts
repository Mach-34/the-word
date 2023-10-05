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
    // command options
    const program = new Command();
    program
        .version("0.1.0")
        .description("A game to see how big a secret can become before it's too big to keep")
    //     .option("-w, --word <word>", "The phrase/ word being proven (e.g. \"Greese\"")
    //     .option("-p, --proof <path-to-proof-output>", "Generate a proof of knowledge of the hash of a song in the given directory")
    //     .option("-v, --verify <path-to-saved-proof>", "Verify a proof of knowledge of the hash of a song")
    //     .option("-ha, --hash <phrase hash>", "Optional hash of phrase to verify (can be taken from proof file)")
    //     .option("-k, --private-key <private-key>", "Private key to use for signing transactions")
    //     .parse(process.argv);

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
    program.parseAsync(process.argv);
    if (program.args[0] == "create") {
        await createRound(program.args[1], program.args[2], program.args[3]);
    }
    // // handle commands
    // if (process.argv.length < 3) {
    //     program.help()
    // } else if (options.proof) {
    //     if (!options.title) {
    //         console.log(`${chalk.red("ERROR: ")}must provide a song title to hash with ${chalk.green("-t \"title\"")} when proving!`);
    //     } else {
    //         await proveCommand(options.title, options.proof);
    //     }
    // } else if (options.verify) {
    //     if (!options.hash) {
    //         console.log(`${chalk.red("ERROR: ")}must provide a song hash to verify with ${chalk.green("-ha \"hash\"")} when verifying!`);
    //     } else {
    //         await verifyCommand(options.verify, options.hash);
    //     }
    // } else;if (options.)
}

/**
 * Command that handles proving knowledge of the preimage song title that creates a hash
 * @param phrase - the word to hash
 * @param proofPath - the path to save the computed proof to
 */
async function proveCommand(phrase: string, proofPath: string) {
    // convert inputted song title to field elements
    if (phrase.length > 180) {
        console.log(`${chalk.red("ERROR: ")} a phrase cannot be more than 180 characters long`);
        return;
    }

    // check and format proof filepath
    const directory = checkProofPathDir(proofPath);
    if (directory == "") {
        console.log(`${chalk.red("ERROR: ")} ${directory} is not a valid directory`);
        return;
    }
    const filepath = `${directory}/the_word_proof.json`;

    // initialize proving engine
    const engine = await CircomEngine.init();

    // chunk the input
    const input: CircuitInput = { phrase: engine.chunk(phrase) };

    // generate proof
    const { proof, publicSignals } = await engine.prove(input);
    const hash = `0x${BigInt(publicSignals[0]).toString(16)}`;

    // save proof to file
    fs.writeFileSync(filepath, JSON.stringify(proof, null, 2));
    console.log(`Proved secret song title ${chalk.cyan(`"${phrase}"`)} creats public hash ${chalk.cyan(`"${hash}"`)}`);
    console.log(`Saved to proof to ${chalk.green(filepath)}`);
}

/**
 * Verify a given proof of knowledge of a song title hash
 * @param proofPath - the saved file containing the proof
 * @param hash - the hash of the song title to verify (optional, can be taken from proof file)
 */
async function verifyCommand(proofPath: string, hash: string) {
    // check if proof path is valid
    if (!checkProofPath(proofPath)) {
        console.log(`${chalk.red("ERROR: ")} ${proofPath} does not point to a json file!`);
        return;
    }

    // read the proof from the file
    const proof = (await getProof(proofPath)).default;

    // marshall hash from arguments
    if (hash.slice(0, 2) != "0x") {
        hash = `0x${hash}`;
    }
    let publicSignals = [BigInt(hash)];

    // initialize proving engine
    const engine = await CircomEngine.init();

    // verify the proof
    const verified = await engine.verify(proof, publicSignals);
    if (verified) {
        console.log(`${chalk.green("VERIFIED")} proof of knowledge of song hash ${chalk.cyan(`0x${hash}`)}`);
    } else {
        console.log(`${chalk.red("COULD NOT VERIFY")} proof of knowledge of song hash ${chalk.cyan(hash)}`);
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

main()
    .then(() => { process.exit(0); })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });