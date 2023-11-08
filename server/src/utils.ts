import "dotenv/config";
import { Contract, ethers } from "ethers";
import { Groth16Proof } from "snarkjs";
import ABI from "./artifacts/abi.json" assert { type: "json" };
import { groth16 } from "snarkjs";
import { buildPoseidon } from "circomlibjs";

const wasmPath = '../contracts/test/artifacts/the_word.wasm';
const zkeyPath = '../contracts/test/artifacts/the_word.zkey';

// Groth16 proof field elements formatted for solidity arguments
export type SolidityGroth16Proof = {
    a: string[],
    b: string[][],
    c: string[],
}

/**
 * Build contract call args for a proof
 * @dev 'massage' circom's proof args into format parsable by solidity
 * 
 * @param proof - the proof generated from circom circuit
 * @returns - Groth16 proof formatted to work in solidity
 */
export function formatProof(proof: Groth16Proof): SolidityGroth16Proof {
    return {
        a: proof.pi_a.slice(0, 2),
        b: [
            proof.pi_b[0].slice(0).reverse(),
            proof.pi_b[1].slice(0).reverse(),
        ],
        c: proof.pi_c.slice(0, 2),
    };
}

/**
 * Instantiate the contract with a signer
 * 
 * @return - TheWord contract connected to the defined rpc with defined signer 
 */
export function getContract(): Contract {
    // connect to remote rpc
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    // connect signer to provider
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    // return contract instantiated with wallet provider
    return new ethers.Contract(process.env.CONTRACT_ADDRESS!, ABI, wallet);
}

/**
 * Converts a given word to array of 7 field elements
 * @dev split into 31-byte strings to fit in finite field and pad with 0's where necessary
 * @dev spotify allows maximum song length of 200 characters, so 7 field elements are used
 * @param title - the string entered by user to compute hash for (will be length checked)
 * @return - array of 7 bigints compatible with noir field element api
 */
export function convertTitleToFelts(title: string): Array<bigint> {
    // check length of title does not exceed spotify's requirements
    if (title.length > 180)
        throw Error('title too long: must be <= 200 characters');
    // convert to chunks of bytes
    let chunks: bigint[] = [];
    for (let i = 0; i < 6; i++) {
        const start = i * 31;
        const end = (i + 1) * 31;
        let chunk: Buffer;
        if (start >= title.length) {
            // if start is out of bounds, field element = 0
            chunk = Buffer.alloc(31);
        } else if (end > title.length) {
            // if end is out of bounds, pad front with 0's
            const partial = Buffer.from(title.slice(start), 'utf-8');
            chunk = Buffer.concat([partial, Buffer.alloc(31 - partial.length)]);
        } else {
            // chunk 31 bytes from the title string
            chunk = Buffer.from(title.slice(start, end), 'utf-8');
        }
        // pad an additional 0 to the front of the chunk
        chunk = Buffer.concat([Buffer.alloc(1), chunk]);
        // return as compatible hex string
        chunks.push(BigInt(`0x${chunk.toString('hex')}`) as bigint);
    }
    return chunks;
}

/**
 * Convers a utf-8 string (username) into a `bigint`
 * 
 * @param username - the string to convert to utf8 then decimal on bn254
 * @returns - the username as a `bigint` compatible with a single bn254 field element (Fr)
 */
export function usernameToBigint(username: string): bigint {
    if (username.length > 31)
        throw new Error('username too long: must be <= 31 characters');
    // encode utf8
    const encoder = new TextEncoder();
    const encoded = encoder.encode(username);
    // convert to bigint
    const hex = Buffer.from(encoded).toString('hex')
    return BigInt(`0x${hex}`) as bigint;
}

export const generateProofAndCommitment = async (secret: string, usernameEncoded: string) => {
    const poseidon = await buildPoseidon();
    const F = poseidon.F;
    const { proof } = await groth16.fullProve(
        { phrase: convertTitleToFelts(secret), username: usernameEncoded },
        wasmPath,
        zkeyPath
    );
    const felts = convertTitleToFelts(secret);
    const commitment = F.toObject(poseidon(felts));
    return { message: commitment, proof };
}
