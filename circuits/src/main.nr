use dep::std::hash::poseidon::bn254::hash_7;

fn main(preimage: [Field; 7]) -> pub Field {
    hash_7(preimage)
}
