import { executeCircuit, compressWitness, WitnessMap } from '@noir-lang/acvm_js';
import {
    Crs,
    RawBuffer,
    newBarretenbergApiAsync,
    BarretenbergApiAsync
} from '@aztec/bb.js/dest/node/index.js';
import { Ptr } from "@aztec/bb.js/dest/node/types/ptr.js";
import circuit from "../circuit.json" assert { type: "json" };
import { decompressSync } from 'fflate';

/**
 * Initializes the proving engine
 * 
 * @param acir - the decompressed ACIR bytecode for the hash circuit
 * @return bb - the initialized Barretenberg API worker
 * @return composer - the initialized Barretenberg proof composer
 */
async function init(acir: Uint8Array) : Promise<{ bb: BarretenbergApiAsync, composer: Ptr }> {
    const bb = await newBarretenbergApiAsync(4);
    const composer = await getComposer(bb, acir);
    return { bb, composer };
}

/**
 * Unmarshalls and returns ACIR bytecode for the hash circuit
 * @return acir - the and compressed ACIR bytecode
 * @return acirDecompressed - the decompressed ACIR bytecode
 */
function getAcir(): { acir: Buffer, acirDecompressed: Uint8Array } {
    const acir = Buffer.from(circuit.bytecode, 'base64');
    const acirDecompressed = decompressSync(acir);
    return { acir, acirDecompressed };
}

/**
 * Generates a proof composer for Noir UltraPlonk proofs
 * @param bb - initialized Barretenberg API worker
 * @param acir - ACIR bytecode for the hash circuit
 * @returns - barretenberg proof composer
 */
async function getComposer(bb: BarretenbergApiAsync, acir: Uint8Array): Promise<Ptr> {
    const [_, circuitSize] = await bb.acirGetCircuitSizes(acir);
    const subgroupSize = Math.pow(2, Math.ceil(Math.log2(circuitSize)));
    const crs = await Crs.new(subgroupSize + 1);
    await bb.commonInitSlabAllocator(subgroupSize);
    await bb.srsInitSrs(new RawBuffer(crs.getG1Data()), crs.numPoints, new RawBuffer(crs.getG2Data()));
    return await await bb.acirNewAcirComposer(subgroupSize);
}

/**
 * Computes the witness for a proof
 * @param input - the formatted field elements of the song title as 32-byte hex strings
 * @param acirBuffer - the ACIR bytecode for the hash circuit
 * @return - the serialized witness map
 */
async function generateWitness(input: Array<string>, acirBuffer: Buffer): Promise<Uint8Array> {
    // set initial witness map
    if (input.length != 7)
        throw Error('input must be 7 field elements');
    const initialWitness = new Map<number, string>();
    for (let i = 0; i < 7; i++) {
        initialWitness.set(i + 1, input[i]);
    }

    // compute the full witness for the circuit
    let witness = await executeCircuit(acirBuffer, initialWitness, () => {
        throw Error('unexpected oracle');
    });

    return await compressWitness(witness);
}

/**
 * Generate an UltraPlonk proof for the noir hash circuit
 * @param bb - the barretenberg api worker
 * @param composer - the barretenberg proof composer
 * @param acir - the decompressed ACIR bytecode for the hash circuit
 * @param witness - the previously computed witness map for this proof
 * @returns 
 */
async function prove(
    bb: BarretenbergApiAsync,
    composer: Ptr,
    acir: Uint8Array,
    witness: Uint8Array,
): Promise<Uint8Array> {
    return await bb.acirCreateProof(
        composer,
        acir,
        decompressSync(witness),
        false,
    );
}

/**
 * Verify a given UltraPlonk proof of knowledge of a song title hash
 * @param bb - the barretenberg api worker
 * @param composer - the barretenberg proof composer
 * @param acir - the decompressed ACIR bytecode for the hash circuit
 * @param proof - the computed proof of knowledge of the preimage for a given song title hash
 */
async function verify(
    bb: BarretenbergApiAsync,
    composer: Ptr,
    acir: Uint8Array,
    proof: Uint8Array,
) : Promise<boolean> {
    await bb.acirInitProvingKey(composer, acir);
    return await bb.acirVerifyProof(composer, proof, false);
}

export {
    circuit,
    init,
    getAcir,
    getComposer,
    generateWitness,
    prove,
    verify,
}
