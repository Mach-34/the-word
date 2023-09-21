#!/bin/bash

GREEN='\033[0;32m'
NC='\033[0m'

# Compile circuit
echo -e "${GREEN}compile-circuit.sh ${NC}| Compiling circuit..."
cd circuits
nargo compile &> /dev/null

# Move circuit to src
mv ./target/circuits.json ../src/circuit.json
cd ..
echo -e "${GREEN}compile-circuit.sh ${NC}| Circuit compiled to $(pwd)/src/circuit.json"