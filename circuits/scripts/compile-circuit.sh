#!/bin/bash

GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${GREEN}compile-circuit.sh${NC}| compiling r1cs proving and verifying artifacts for the_word circom circuit, wait ~ 30 seconds..."

# if zkey does not exist, make folder
[ -d zkey ] || mkdir zkey

# compile circuit
circom the_word.circom -o artifacts --r1cs --wasm &> /dev/null

# Setup
yarn snarkjs groth16 setup \
    artifacts/the_word.r1cs \
    artifacts/pot10_final.ptau \
    artifacts/the_word.zkey &> /dev/null

# Reference zkey
yarn snarkjs groth16 setup \
    artifacts/the_word.r1cs \
    artifacts/pot10_final.ptau \
    zkey/the_word_0000.zkey \
    &> /dev/null

# Circuit-specific contributions
yarn snarkjs zkey contribute \
    zkey/the_word_0000.zkey \
     zkey/the_word_0001.zkey \
    --name="First the_word contribution" -v -e="$(head -n 4096 /dev/urandom | openssl sha1)" \
    &> /dev/null

yarn snarkjs zkey contribute \
    zkey/the_word_0001.zkey \
    zkey/the_word_0002.zkey \
    --name="Second the_word contribution" -v -e="$(head -n 4096 /dev/urandom | openssl sha1)" \
    &> /dev/null

yarn snarkjs zkey contribute \
    zkey/the_word_0002.zkey \
    zkey/the_word_0003.zkey \
    --name="Third the_word contribution" -v -e="$(head -n 4096 /dev/urandom | openssl sha1)" \
    &> /dev/null

# Verify zkey
yarn snarkjs zkey verify \
    artifacts/the_word.r1cs \
    artifacts/pot10_final.ptau \
    zkey/the_word_0003.zkey \
    &> /dev/null

# Apply random beacon
yarn snarkjs zkey beacon zkey/the_word_0003.zkey \
    artifacts/the_word.zkey \
    0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="the_word FinalBeacon phase2" \
    &> /dev/null

# Verify final zkey
yarn snarkjs zkey verify \
    artifacts/the_word.r1cs \
    artifacts/pot10_final.ptau \
    artifacts/the_word.zkey \
    &> /dev/null

# Export zkey to json
yarn snarkjs zkey export verificationkey \
    artifacts/the_word.zkey \
    artifacts/verifier.json \
    &> /dev/null

# Export solidity verifier
yarn snarkjs zkesv \
    artifacts/the_word.zkey \
    artifacts/Verifier.sol \
    &> /dev/null

# Remove unnecessary js proving artifacts
mv artifacts/the_word_js/the_word.wasm artifacts/the_word.wasm
rm -rf artifacts/the_word_js
rm artifacts/the_word.r1cs

echo -e "${GREEN}compile-circuit.sh${NC}| successfully built proving/ verifying artifacts for the_word!"
echo -e "${GREEN}compile-circuit.sh${NC}| artifacts located at ${CYAN}$(pwd)/artifacts${NC}"

