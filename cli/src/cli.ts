#!/usr/bin/env node --no-warnings
import {
    CircomEngine,
    CircuitInput,
    API_URL,
} from "./index.js";
import figlet from 'figlet';
import { Command, Argument } from "commander";
import chalk from "chalk";
import fs from "fs";
import { execSync } from "child_process";

async function main() {
    // log header
    console.log(figlet.textSync('The Word'));

    // commander cli definition
    const program = new Command();
    program
        .version("0.1.0")
        .description("A game to see how big a secret can become before it's too big to keep")

    // create new round command
    /// DISABLE THIS COMMAND UNTIL FURTHER NOTICE ///
    // program
    //     .command("create")
    //     .argument("<phrase>", "The phrase/ word being proven")
    //     .argument("<username>", "A unique username to associate this action with")
    //     .argument("<hint>", "Hint to guessing the secret phrase")
    //     .description("Create a new round with a secret phrase")
    //     .action(async (phrase, username, hint) => {
    //         // check args exist
    //         if (!phrase || !username || !hint) {
    //             console.log(`${chalk.red("ERROR: ")}must provide a phrase, username, and hint!`);
    //             return;
    //         }
    //     });

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

    // whisper solution command
    program
        .command("whisper")
        .argument("<round>", "The round to whisper to")
        .argument("<phrase>", "The secret phrase to prove knowledge of and whisper")
        .argument("<username>", "A unique username to associate this action with")
        .description("Whisper a secret phrase")
        .action(async (round, phrase, username) => {
            // check args exist
            if (!round || !phrase || !username) {
                console.log(`${chalk.red("ERROR: ")}must provide a round number, phrase, and username!`);
                return;
            }
        });

    // prove knowledge of an arbitrary secretphrase
    program
        .command("prove")
        .argument("<phrase>", "The secret phrase to prove knowledge of and whisper")
        .argument("<username>", "A unique username to associate this action with")
        .description("Whisper a secret phrase")
        .action(async (phrase, username) => {
            // check args exist
            if (!phrase || !username) {
                console.log(`${chalk.red("ERROR: ")}must provide a phrase and username!`);
                return;
            }
        });

    // shout solution command
    program
        .command("shout")
        .argument("<round>", "The round to shout to")
        .argument("<phrase>", "The secret phrase to prove knowledge of and shout")
        .argument("<username>", "A unique username to associate this action with")
        .description("Shout a secret phrase")
        .action(async (round, phrase, username) => {
            // check args exist
            if (!round || !phrase || !username) {
                console.log(`${chalk.red("ERROR: ")}must provide a round number, phrase, and username!`);
                return;
            }
        });

    // argument handler
    // todo: more robust argument handling
    program.parseAsync(process.argv);
    /// DISABLE CREATE COMMAND UNTIL FURTHER NOTICE ///
    // if (program.args[0] == "create") {
    //     await createRound(program.args[1], program.args[2], program.args[3]);
    if (program.args[0] == "get") {
        await getRound(program.args[1]);
    } else if (program.args[0] == "whisper") {
        await whisper(program.args[1], program.args[2], program.args[3]);
    } else if (program.args[0] == "shout") {
        await shout(program.args[1], program.args[2], program.args[3]);
    } else if (program.args[0] == "prove") {
        await prove(program.args[1], program.args[2]);
    }
}


/**
 * Create a new round of TheWord from the cli
 * 
 * @param phrase - the secret phrase to guess
 * @param username - the username to associate this action with
 * @param hint - the hint given to help others guess the secret phrase
 */
async function createRound(phrase: string, username: string, hint: string) {
    // get address
    console.log("=====================================")
    console.log("Creating a new round...")
    console.log(`Secret Phrase: "${chalk.cyan(`${phrase}`)}"`);
    console.log(`Song hint: "${chalk.cyan(`${hint}`)}"`);
    console.log(`Username: "${chalk.cyan(username)}"`);
    // convert inputted song title to field elements
    if (phrase.length > 180) {
        console.log(`${chalk.red("ERROR: ")} a phrase cannot be more than 180 characters long`);
        return;
    }

    // initialize proving engine
    const engine = await CircomEngine.init();

    // format input
    const input: CircuitInput = engine.toInputs(phrase, username);

    // generate proof
    const { proof, publicSignals } = await engine.prove(input);
    const hash = `0x${BigInt(publicSignals[0]).toString(16)}`;

    // send to server
    const URL = `${API_URL}/create`;
    const res = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message: hash,
            username,
            proof,
            hint
        })
    });

    console.log("=====================================")
    if (res.status != 201) {
        console.log(`${chalk.red("ERROR: ")} ${await res.text()}}`);
    } else {
        // write proof to file
        const pwd = execSync('pwd').toString().replace(/(\r\n|\n|\r)/gm, "");
        const filepath = `${pwd}/the-word-proof.json`;
        const data = {
            proof,
            publicSignals,
        };
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        // log result
        const body = await res.json();
        console.log(`${chalk.green("SUCCESS: ")} created new round`);
        console.log(`Round number: ${chalk.cyan(body.round)}`);
        console.log(`Tx hash: ${chalk.cyan(body.tx)}`);
        console.log(`Proof saved to ${chalk.cyan(filepath)}`)
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
    const URL = `${API_URL}/round/${round}`;
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
        if (!data.active)
            console.log(`Secret: "${chalk.cyan(`${data.secret}`)}"`);
        console.log(`Hint: "${chalk.cyan(data.hint)}"`);
        console.log(`Number of whispers: ${chalk.cyan(data.numWhispers)}`);
        if (!data.active)
            console.log(`Shouted by: ${chalk.cyan(data.shouter)}`);
        console.log(`=====================================`)
    }
}

/**
 * Whisper the solution to a secret phrase from TheWord cli
 * 
 * @param round - the round to whisper solution for
 * @param phrase - the secret phrase to prove knowledge of
 * @param username - the username to associate this action with
 */
async function whisper(round: string, phrase: string, username: string) {
    // try to parse round number
    try {
        Number(round);
    } catch (error) {
        console.log(`${chalk.red("ERROR: ")} round must be a number`);
        return;
    }

    // get address
    console.log("=====================================")
    console.log("Whispering solution for a round...")
    console.log(`Round number: ${chalk.cyan(round)}`);
    console.log(`Secret Phrase: "${chalk.cyan(`${phrase}`)}"`);
    console.log(`Username: "${chalk.cyan(username)}"`);

    // convert inputted song title to field elements
    if (phrase.length > 180) {
        console.log(`${chalk.red("ERROR: ")} a phrase cannot be more than 180 characters long`);
        return;
    }

    // initialize proving engine
    const engine = await CircomEngine.init();

    // format input
    const input: CircuitInput = engine.toInputs(phrase, username);

    // generate proof
    const { proof, publicSignals } = await engine.prove(input);
    const hash = `0x${BigInt(publicSignals[0]).toString(16)}`;

    // send to server
    const URL = `${API_URL}/whisper`;
    const res = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            round,
            message: hash,
            username,
            proof,
        })
    });

    // response
    console.log("=====================================")
    if (res.status != 201) {
        console.log(`${chalk.red("ERROR: ")} ${await res.text()}}`);
    } else {
        // write proof to file
        const pwd = execSync('pwd').toString().replace(/(\r\n|\n|\r)/gm, "");
        const filepath = `${pwd}/the-word-proof.json`;
        const data = {
            proof,
            publicSignals,
        };
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        console.log(`${chalk.green("SUCCESS: ")} whispered solution to round ${chalk.cyan(round)}`);
        console.log(`Proof saved to ${chalk.cyan(filepath)}`)
    }
    console.log("=====================================")
}

/**
 * Prove knowledge of an arbitrary secret phrase from TheWord cli
 * Save the solution to the fs without interacting with remote resources
 * 
 * @param phrase - the secret phrase to prove knowledge of
 * @param username - the username to associate this action with
 */
async function prove(phrase: string, username: string) {
    // get address
    console.log("=====================================")
    console.log("Proving knowledge of a secret phrase...")
    console.log(`Secret Phrase: ${chalk.cyan(`"${phrase}"`)}`);
    console.log(`Username: "${chalk.cyan(username)}"`);

    // convert inputted song title to field elements
    if (phrase.length > 180) {
        console.log(`${chalk.red("ERROR: ")} a phrase cannot be more than 180 characters long`);
        return;
    }

    // initialize proving engine
    const engine = await CircomEngine.init();

    // format input
    const input: CircuitInput = engine.toInputs(phrase, username);

    // generate proof
    const { proof, publicSignals } = await engine.prove(input);

    // response
    console.log("=====================================")
    // write proof to file
    const pwd = execSync('pwd').toString().replace(/(\r\n|\n|\r)/gm, "");
    const filepath = `${pwd}/the-word-proof.json`;
    const data = {
        proof,
        publicSignals,
    };
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`${chalk.green("SUCCESS: ")}Proof saved to ${chalk.cyan(filepath)}`);
    console.log(``)
    console.log("=====================================")
}

/**
 * Shout the solution to a secret phrase from TheWord cli
 * 
 * @param round - the round to shout solution for
 * @param phrase - the secret phrase to expose publicly
 * @param username - the username to associate this action with
 */
async function shout(round: string, phrase: string, username: string) {
    // try to parse round number
    try {
        Number(round);
    } catch (error) {
        console.log(`${chalk.red("ERROR: ")} round must be a number`);
        return;
    }

    // get address
    console.log("=====================================")
    console.log("Shouting solution for a round...")
    console.log(`Round number: ${chalk.cyan(round)}`);
    console.log(`Secret Phrase: "${chalk.cyan(`"${phrase}`)}"`);
    console.log(`Username: "${chalk.cyan(username)}"`);

    // send to server
    const URL = `${API_URL}/shout`;
    const res = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            round,
            message: phrase,
            username
        })
    });

    // response
    console.log("=====================================")
    if (res.status != 201) {
        console.log(`${chalk.red("ERROR: ")} ${await res.text()}`);
    } else {
        console.log(`${chalk.green("SUCCESS: ")} shouted solution to round ${chalk.cyan(round)}`);
    }
    console.log("=====================================")
}

main()
    .then(() => { process.exit(0); })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });