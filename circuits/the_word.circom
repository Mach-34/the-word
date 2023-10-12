pragma circom 2.1.6;

include "node_modules/circomlib/circuits/poseidon.circom";

template the_word(num_felts) {
    
    signal input phrase[num_felts];
    signal input username;
    signal output hash;

    // constrain the proof to a username domain
    signal domain <== username * username;

    // constrained computation of poseidon hash
    component hasher = Poseidon(num_felts);

    for (var i = 0; i < num_felts; i++) {
        hasher.inputs[i] <== phrase[i];
    }

    hash <== hasher.out;
}

component main { public [username] } = the_word(6);
// component main = the_word(6);