#!/bin/bash

# generate contracts
cd circuits
mv ./contract/circuits/plonk_vk.sol ../contracts/src/plonk_vk.sol
cd ..
echo "verifier-contract.sh: built verifier contract at $(pwd)/contracts/src/plonk_vk.sol"