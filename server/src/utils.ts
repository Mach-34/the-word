import "dotenv/config";
import { Contract, ethers } from "ethers";
import { Groth16Proof } from "snarkjs";
import ABI from "./artifacts/abi.json" assert { type: "json" };

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