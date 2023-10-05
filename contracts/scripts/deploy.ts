import { ethers } from 'hardhat';
import { poseidonContract } from 'circomlibjs';
import { Signer } from 'ethers';

async function main() {
    const network = await ethers.provider.getNetwork();
    console.log(`====================================`);
    console.log(`Deploying TheWord to ${network.name} (${network.chainId})...`)
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

    console.log(`Deployed TheWord to ${ await theWord.getAddress()}`)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });