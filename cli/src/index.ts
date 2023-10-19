import { CircomEngine, CircuitInput, Groth16Proof } from "./utils/circom.js";
import { checkProofPathDir, checkProofPath, getProof } from "./utils/fs.js";
const API_URL = "https://theword.mach34.space";

export {
    CircomEngine,
    CircuitInput,
    Groth16Proof,
    checkProofPathDir,
    checkProofPath,
    getProof,
    API_URL,
};