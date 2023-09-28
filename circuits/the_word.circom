pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/poseidon.circom";

template the_word(num_felts) {
    
    signal input phrase[num_felts];
    signal output hash;

    component hasher = Poseidon(num_felts);

    for (var i = 0; i < num_felts; i++) {
        hasher.inputs[i] <== phrase[i];
    }

    hash <== hasher.out;
}

component main = the_word(7);