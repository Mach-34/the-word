import { newBarretenbergApiAsync } from '@aztec/bb.js/dest/node/index.js';
import { convertTitleToFelts } from "./utils/words.js";
import { generateWitness, getComposer, getAcir, prove, verify } from "./utils/noir.js";
import { compress } from 'fflate';

async function main() {
    // init proving engine
   
    const bb = await newBarretenbergApiAsync(4);
    const { acir, acirDecompressed } = getAcir();
    const composer = await getComposer(bb, acirDecompressed);

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
}

main()
    .then(() => { process.exit(0); })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });