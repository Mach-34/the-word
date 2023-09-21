#!/usr/bin/env node --no-warnings
import {
    getAcir,
    init,
    convertTitleToFelts,
    generateWitness,
    prove,
    verify,
    checkProofPathDir,
    checkProofPath
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
        await verifyCommand(options.verify, options.hash);
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
    let preimage = convertTitleToFelts(title);
    
    // check and format proof filepath
    const directory = checkProofPathDir(proofPath);
    if (directory == "") {
        console.log(`${chalk.red("ERROR: ")} ${directory} is not a valid directory`);
        return;
    }
    const filepath = `${directory}/song_hash.proof`;

    // get circuit artifacts & initialize proving engine
    const { acir, acirDecompressed } = getAcir();
    const { bb, composer } = await init(acirDecompressed);

    // compute the witness for the proof
    let witness = await generateWitness(preimage, acir);
    // generate the proof
    const proof = await prove(bb, composer, acirDecompressed, witness);

    // save proof to file
    fs.writeFileSync(filepath, proof);
    console.log(`Proof of knowledge of song title ${chalk.cyan(`"${title}"`)} saved to ${chalk.green(filepath)}`);
}

/**
 * Verify a given proof of knowledge of a song title hash
 * @param proofPath - the saved file containing the proof
 * @param hash - the hash of the song title to verify (optional, can be taken from proof file)
 */
async function verifyCommand(proofPath: string, hash: string | undefined) {
    // check if proof path is valid
    if (!checkProofPath(proofPath)) {
        console.log(`${chalk.red("ERROR: ")} ${proofPath} is not a valid proof file (be data file type with extension .proof)`);
        return;
    }
    // read the proof from the file
    let proof = new Uint8Array(fs.readFileSync(proofPath));

    // optionally slice in the hash
    if (hash) {
        // remove 0x from front of hash if it exists
        if (hash.slice(0, 2) == "0x") {
            hash = hash.slice(2);
        }
        // check if hash length is valid
        if (hash.length != 64) {
            console.log(`${chalk.red("ERROR: ")} ${hash} is not a valid hash (must be 32 bytes)`);
            return;
        }
        // slice in the hash
        proof = new Uint8Array([...proof.slice(32), ...new Uint8Array(Buffer.from(hash, 'hex'))]);
    } else {
        hash = Buffer.from(proof.slice(0, 32)).toString('hex');
    }
    
    // get circuit artifacts & initialize proving engine
    const { acirDecompressed } = getAcir();
    const { bb, composer } = await init(acirDecompressed);
    
    // verify the proof:
    let verified = await verify(bb, composer, acirDecompressed, proof);
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