import { groth16 } from "snarkjs";
import { buildPoseidon, Poseidon } from "circomlibjs";
import { convertTitleToFelts } from "./words.js";
import vkey from "../artifacts/verifier.json" assert { type: "json" };

const zkey = "src/artifacts/the_word.zkey";
const wasm = "src/artifacts/the_word.wasm";

type CircuitInput = {
    // secret phrase chunked into field elements
    phrase: Array<bigint>,
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

    chunk(phrase: string): Array<bigint> {
        return convertTitleToFelts(phrase);
    }

    async hash(phrase: Array<any>): Promise<bigint> {
        return await this.F.toObject(this.poseidon(phrase));
    }

    async prove(input: CircuitInput): Promise<any> {
        return await groth16.fullProve(input, wasm, zkey);
    }

    async verify(proof: any, publicSignals: any) : Promise<boolean> {
        return await groth16.verify(vkey, publicSignals, proof);
    }
}

export {
    CircomEngine,
    CircuitInput,
}