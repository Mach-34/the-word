import { CircomEngine, CircuitInput } from "./index.js";

async function main() {

    // Initialize the proving engine
    const engine = await CircomEngine.init();

    // Get input to hash
    const test_word = "this is a song, I prommise it is a song. it might be long, but what are you going to do about it?";
    const test_felts = engine.chunk(test_word);

    // Compute hash of the secret phrase
    const hash = await engine.hash(test_felts);

    // Build input struct
    const input: CircuitInput = { phrase: test_felts };

    // Compute proof
    const { proof } = await engine.prove(input);

    // Verify proof
    let verified = await engine.verify(proof, [hash]);

    console.log("Proof verifier: ", verified);
}

main()
    .then(() => { process.exit(0); })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });