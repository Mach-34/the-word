import { poseidonContract, buildPoseidonOpt } from 'circomlibjs';

/**
 * Generates Poseidon bytecode from circomlibjs and saves it
 */
async function savePoseidonBytecode() {
    const poseidon = await buildPoseidonOpt();

    const abi = poseidonContract.generateABI(6);
    const bytecode = poseidonContract.createCode(6);

    console.log("Abi: ", abi);
    console.log("Bytecode: ", bytecode);
}

savePoseidonBytecode();