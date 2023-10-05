import { ethers } from 'hardhat';
import { buildPoseidon, Poseidon } from 'circomlibjs';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { groth16 } from 'snarkjs';
import { initialize, convertTitleToFelts, formatProof } from './utils';
import vkey from './artifacts/verifier.json';

const wasmPath = 'test/artifacts/the_word.wasm';
const zkeyPath = 'test/artifacts/the_word.zkey';

describe('Test The Word Contract', async () => {
    // wallets to interact with
    let backend: HardhatEthersSigner;
    let alice: HardhatEthersSigner;
    let bob: HardhatEthersSigner;
    // deployed "the word" contract
    let contract: Contract;
    // poseidon hash function
    let poseidon: Poseidon;
    // bn254 field util
    let F: any;

    before(async () => {
        // set signers
        const addresses = await ethers.getSigners();
        backend = addresses[0];
        alice = addresses[1];
        bob = addresses[2];
        // deploy contract
        const contractAddress = await initialize();
        contract = await ethers.getContractAt('TheWord', contractAddress);
        // // instantiate poseidon hash function
        poseidon = await buildPoseidon();
        // set field util
        F = poseidon.F;
    });

    describe("Test Word Commitment", async () => {
        it("Test Word Serialization", async () => {
            // get expected felts
            const secretPhrase = "this phrase is longer than just a single field element";
            const felts = convertTitleToFelts(secretPhrase);

            // compute the felts from the smart contract
            const serialized = await contract.secretToFelts(secretPhrase);

            // compare field elements
            for (let i = 0; i < serialized.length; i++)
                expect(serialized[i]).to.be.equal(felts[i]);
        });
        it("Test Word Hashing", async () => {
            // get expected hash of secret phrase
            const secretPhrase = "this phrase is longer than just a single field element";
            const felts = convertTitleToFelts(secretPhrase);
            const commitment = F.toObject(poseidon(felts));

            // compute the hash from the smart contract
            const hash = await contract.hashPhrase(felts);

            // check that the hashes match
            expect(hash == commitment);
        });

    })

    describe("Create a new round", async () => {
        it("Cannot create new round if knowledge of preimage fails", async () => {
            // generate the hash asserted in the contract
            const assertedSecret = "hunter2";
            const commitment = F.toObject(poseidon(convertTitleToFelts(assertedSecret)));

            // prove for the second secret
            const secret = "hunter3";
            const { proof } = await groth16.fullProve(
                { phrase: convertTitleToFelts(secret) },
                wasmPath,
                zkeyPath
            );

            // format proof for solidity
            const formattedProof = formatProof(proof);

            // fail to create a new round
            await expect(contract.newRound(commitment, formattedProof))
                .to.be.revertedWith("Invalid proof");
        });
        it("Create a round with no prize", async () => {
            // compute commitment to secret
            const secret = "hunter2";
            const felts = convertTitleToFelts(secret);
            const commitment = F.toObject(poseidon(felts));

            // prove knowledge of secret
            const { proof } = await groth16.fullProve(
                { phrase: felts },
                wasmPath,
                zkeyPath
            );

            // format proof for solidity
            const formattedProof = formatProof(proof);

            // expect transaction success
            const tx = contract.newRound(commitment, formattedProof);
            await expect(tx).to.emit(contract, "NewRound").withArgs(1, commitment, 0);
        });
        it("Create a round with a prize", async () => {
            // compute commitment to secret
            const secret = "This is a much longer phrase. Chances are, you don't know this phrase!";
            const felts = convertTitleToFelts(secret);
            const commitment = F.toObject(poseidon(felts));

            // prove knowledge of secret
            const { proof } = await groth16.fullProve(
                { phrase: felts },
                wasmPath,
                zkeyPath
            );

            // format proof for solidity
            const oneEth = ethers.parseUnits("1", "ether");
            const formattedProof = formatProof(proof);
            const tx = contract.newRound(commitment, formattedProof, { value: oneEth });
            await expect(tx).to.emit(contract, "NewRound").withArgs(2, commitment, oneEth);
        });
    })
    describe("Shout to end round", async () => {
        it("Cannot shout if game does not exist", async () => {
            // fail to shout on game that does not exist
            const address = await alice.getAddress();
            await expect(contract.shout(3, "password", alice))
                .to.be.revertedWith("Round is not active");
        });
        it("Cannot shout if wrong secret is provided", async () => {
            // fail to shout if wrong secret is provided
            const address = await alice.getAddress();
            await expect(contract.shout(1, "hunter3", address))
                .to.be.revertedWith("Invalid secret phrase");
        });
        it("Shout on game with no prize", async () => {
            // shout with the correct secret
            const secret = "hunter2";
            const address = await alice.getAddress();
            const tx = (contract.connect(alice) as Contract).shout(1, secret, address);
            await expect(tx).to.emit(contract, "Shouted").withArgs(1, address);
        })
        it("Shout on game with prize", async () => {
            // get balances before shout
            const oneEth = ethers.parseUnits("1", "ether");
            const deadAddress = "0x0000000000000000000000000000000000000000"
            const preBalance = {
                burner: await ethers.provider.getBalance(deadAddress),
                contract: await ethers.provider.getBalance(await contract.getAddress())
            };
            expect(preBalance.burner).to.be.equal(0);
            expect(preBalance.contract).to.be.equal(oneEth);

            // shout with the correct secret
            const secret = "This is a much longer phrase. Chances are, you don't know this phrase!";
            const address = await alice.getAddress();
            const tx = (contract.connect(alice) as Contract).shout(2, secret, address);
            await expect(tx).to.emit(contract, "Shouted").withArgs(2, address);

            // get balances after shout
            const postBalance = {
                burner: await ethers.provider.getBalance(deadAddress),
                contract: await ethers.provider.getBalance(await contract.getAddress())
            };

            // ensure balances have changed as expected
            expect(postBalance.burner).to.be.equal(oneEth);
            expect(postBalance.contract).to.be.equal(0);
        });
        it("Cannot shout if game is over", async () => {
            // fail to shout on game that does not exist
            const address = await alice.getAddress();
            await expect(contract.shout(1, "hunter2", address))
                .to.be.revertedWith("Round is not active");
        });
    });
    describe("Fund prize externally", async () => {
        it("Cannot fund prize if game does not exist", async () => {
            // fail to fund prize on game that does not exist
            const oneEth = ethers.parseUnits("1", "ether");
            await expect(contract.fundPrize(3, { value: oneEth }))
                .to.be.revertedWith("Round is not active");
        })
        it("Cannot fund prize if game is over", async () => {
            // fail to fund prize on game that is over
            const oneEth = ethers.parseUnits("1", "ether");
            await expect(contract.fundPrize(1, { value: oneEth }))
                .to.be.revertedWith("Round is not active");
        })
        it("Fund prize on existing game", async () => {
            // create new round
            const secret = "hunter4";
            const felts = convertTitleToFelts(secret);
            const commitment = F.toObject(poseidon(felts));
            const { proof } = await groth16.fullProve(
                { phrase: felts },
                wasmPath,
                zkeyPath
            );
            const formattedProof = formatProof(proof);
            await contract.newRound(commitment, formattedProof).then(async (tx) => await tx.wait());

            // get balances before funding
            const oneEth = ethers.parseUnits("1", "ether");
            const preBalance = await contract.rounds(3).then((rounds) => rounds.prize);
            expect(preBalance).to.equal(0);
            
            // fund prize
            const tx = contract.fundPrize(3, { value: oneEth });
            await expect(tx).to.emit(contract, "PrizeAdded").withArgs(3, oneEth);

            // get balances after funding
            const postBalance = await contract.rounds(3).then((rounds) => rounds.prize);

            // check that prize balance has increased
            expect(postBalance).to.equal(oneEth);
        })
    })
})