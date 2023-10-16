import { CircomEngine, CircuitInput, Groth16Proof } from "./utils/circom.js";
import { checkProofPathDir, checkProofPath, getProof } from "./utils/fs.js";
import { getWasm } from "./utils/artifacts.js";

const API_URL = "https://theword.mach34.space";

export {
    CircomEngine,
    CircuitInput,
    Groth16Proof,
    checkProofPathDir,
    checkProofPath,
    getProof,
    getWasm,
    API_URL,
};