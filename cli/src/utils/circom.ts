import { groth16, Groth16Proof } from "snarkjs";
import { buildPoseidon, Poseidon } from "circomlibjs";
import { convertTitleToFelts, usernameToBigint } from "./words.js";
import vkey from "./verifier.json" assert { type: "json" };
import path from 'path';
import { fileURLToPath } from 'url';

// import from static artifacts
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTIFACTS_DIR = `${__dirname}/../artifacts`;

type CircuitInput = {
    // secret phrase chunked into field elements
    phrase: Array<bigint>,
    username: bigint,
}

class CircomEngine {
    poseidon: Poseidon;
    F: any;

    constructor(poseidon: Poseidon, F: any) {
        this.poseidon = poseidon;
        this.F = F;
    }

    static async init(): Promise<CircomEngine> {
        const poseidon = await buildPoseidon();
        return new CircomEngine(poseidon, poseidon.F);
    }


    toInputs(phrase: string, username: string): CircuitInput {
        return {
            phrase: convertTitleToFelts(phrase),
            username: usernameToBigint(username),
        }
    }

    async hash(phrase: Array<any>): Promise<bigint> {
        return await this.F.toObject(this.poseidon(phrase));
    }

    async prove(input: CircuitInput): Promise<any> {
        return await groth16.fullProve(
            input,
            `${ARTIFACTS_DIR}/the_word.wasm`,
            `${ARTIFACTS_DIR}/the_word.zkey`
        );
    }

    async verify(proof: any, publicSignals: any) : Promise<boolean> {
        return await groth16.verify(vkey, publicSignals, proof);
    }
}

export {
    CircomEngine,
    CircuitInput,
    Groth16Proof
}