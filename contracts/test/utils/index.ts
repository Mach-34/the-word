import { ethers } from 'hardhat';
import { poseidonContract } from 'circomlibjs';
import { Signer } from 'ethers';
import { Groth16Proof } from 'snarkjs';

export type SolidityGroth16Proof = {
    a: string[],
    b: string[][],
    c: string[],
}

/**
 * Deploy 'The Word' contract and return the deployed address
 * 
 * @return - the address of the deployed contract
 */
export async function initialize(): Promise<string> {
    // get deployer wallet
    // type mismatch bug exists with signers, must set type to any
    // https://ethereum.stackexchange.com/questions/154384/argument-of-type-hardhatetherssigner-is-not-assignable-to-parameter-of-type-s
    const [deployer]: Signer[] = await ethers.getSigners();

    // deploy groth16 verifier
    const verifierFactory = await ethers.getContractFactory('Groth16Verifier');
    const verifier = await verifierFactory.deploy();
    await verifier.waitForDeployment();
    const verifierAddress = await verifier.getAddress();

    // deploy Poseidon library contract
    const poseidonABI = poseidonContract.generateABI(6);
    const poseidonBytecode = poseidonContract.createCode(6);
    const poseidonFactory = new ethers.ContractFactory(
        poseidonABI,
        poseidonBytecode,
        deployer
    );
    const poseidonLib = await poseidonFactory.deploy();
    await poseidonLib.waitForDeployment();
    const poseidonLibAddress = await poseidonLib.getAddress();

    // deploy the word contract
    const theWordFactory = await ethers.getContractFactory('TheWord', {
        libraries: { Poseidon: poseidonLibAddress },
    });
    let theWord = await theWordFactory.deploy(verifierAddress);
    await theWord.waitForDeployment();
    return theWord.getAddress();
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
            // if end is out of bounds, pad end with 0's
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
 * Build contract call args
 * @dev 'massage' circom's proof args into format parsable by solidity
 * @notice further mutation of pi_b occurs @ in our smart contract 
 *         calldata as subgraphs cannot handle nested arrays
 * 
 * @param {Object} proof - the proof generated from circom circuit
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

export function usernameToBigint(username: string): bigint {
    // encode utf8
    const encoder = new TextEncoder();
    const encoded = encoder.encode(username);
    // pad end with 0's
    // const padded = Buffer.concat([Buffer.from(encoded), Buffer.alloc(32 - encoded.length)]);
    // convert to bigint
    const hex = Buffer.from(encoded).toString('hex')
    return BigInt(`0x${hex}`) as bigint;
}