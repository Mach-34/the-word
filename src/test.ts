import {
    init,
    convertTitleToFelts,
    generateWitness,
    getAcir,
    prove,
    verify,
} from "./index.js";

async function main() {

    // init proving engine
    const { acir, acirDecompressed } = getAcir();
    const { bb, composer } = await init(acirDecompressed);

    // get input to hash
    const test_word = "this is a song, I prommise it is a song. it might be long, but what are you going to do about it?";
    const test_felts = convertTitleToFelts(test_word);

    // get the witness
    let witness = await generateWitness(test_felts, acir);
    
    // generate a proof
    const proof = await prove(bb, composer, acirDecompressed, witness);

    // get the public output
    let songHash = Buffer.from(proof.slice(0, 32)).toString('hex');

    // verify the proof
    const verified = await verify(bb, composer, acirDecompressed, proof);

    console.log(`song hash: ${songHash}`);
    console.log(`Proof: ${Buffer.from(proof).toString('hex')}`);
    console.log(`Verified: ${verified}`);
}

main()
    .then(() => { process.exit(0); })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });