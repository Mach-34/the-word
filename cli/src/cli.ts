#!/usr/bin/env node --no-warnings
import {
    CircomEngine,
    CircuitInput,
    checkProofPathDir,
    checkProofPath,
    getProof
} from "./index.js";
import figlet from 'figlet';
import { Command } from "commander";
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
        .option("-t, --title <song title>", "The title of the song to hash, in quotes (e.g. \"Greese\"")
        .option("-p, --proof <path-to-proof-output>", "Generate a proof of knowledge of the hash of a song in the given directory")
        .option("-v, --verify <path-to-saved-proof>", "Verify a proof of knowledge of the hash of a song")
        .option("-ha, --hash <song hash>", "Optional hash of song to verify (can be taken from proof file)")
        .parse(process.argv);
    const options = program.opts();
    // handle commands
    if (process.argv.length < 3) {
        program.help()
    } else if (options.proof) {
        if (!options.title) {
            console.log(`${chalk.red("ERROR: ")}must provide a song title to hash with ${chalk.green("-t \"title\"")} when proving!`);
        } else {
            await proveCommand(options.title, options.proof);
        }
    } else if (options.verify) {
        if (!options.hash) {
            console.log(`${chalk.red("ERROR: ")}must provide a song hash to verify with ${chalk.green("-ha \"hash\"")} when verifying!`);
        } else {
            await verifyCommand(options.verify, options.hash);
        }
    }
}

/**
 * Command that handles proving knowledge of the preimage song title that creates a hash
 * @param word - the word to hash
 * @param proofPath - the path to save the computed proof to
 */
async function proveCommand(title: string, proofPath: string) {
    // convert inputted song title to field elements
    if (title.length > 200) {
        console.log(`${chalk.red("ERROR: ")} a song title cannot be more than 200 characters long`);
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
    const input: CircuitInput = { phrase: engine.chunk(title) };

    // generate proof
    const { proof, publicSignals } = await engine.prove(input);
    const hash = `0x${BigInt(publicSignals[0]).toString(16)}`;

    // save proof to file
    fs.writeFileSync(filepath, JSON.stringify(proof, null, 2));
    console.log(`Proved secret song title ${chalk.cyan(`"${title}"`)} creats public hash ${chalk.cyan(`"${hash}"`)}`);
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

main()
    .then(() => { process.exit(0); })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });