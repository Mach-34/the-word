import 'dotenv/config';
import { Round } from "../src/schema.js";
import { buildPoseidon } from 'circomlibjs';
import { groth16 } from 'snarkjs';
import vkey from "../src/artifacts/verifier.json" assert { type: "json" };
import { generateProofAndCommitment, usernameToBigint } from "../src/utils.js";
import mongoose from 'mongoose';

(async () => {

    const hint = 'This is another fake hint for the second option';
    const prize = 6.90;
    const round = 3;
    const secret = 'Phrase3'
    const username = 'Fakename3';

    const usernameEncoded = `0x${BigInt(usernameToBigint(username)).toString(16)}`;;

    const { message, proof } = await generateProofAndCommitment(secret, usernameEncoded);


    const verified = await groth16.verify(vkey, [message, usernameEncoded.toString()], proof);

    if (verified) {
        await mongoose
            .connect(process.env.MONGO_URL!, { dbName: process.env.DB_NAME! })
        await Round.create({ commitment: message, hint, prize, round });
        process.exit(0);
    } else {
        process.exit(1);
    }
})();