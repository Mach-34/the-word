#!/bin/bash
set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

# WARNING: THIS IS AN INSECURE CRS PROCESS AND IS USED FOR TESTING PURPOSES.
# A REAL TRUSTED SETUP CEREMONY MUST BE PERFORMED IN THE FUTURE AND WILL SHIP WITH REPO
# Todo: Grab trusted setup base from hermez (https://www.dropbox.com/sh/mn47gnepqu88mzl/AACaJkBU7mmCq8uU8ml0-0fma)

echo -e "${GREEN}crs.sh${NC}| generating TEST Powers of Tau file, wait ~ 20 seconds..."

# if crs folder does not exist, create
[ -d crs ] || mkdir crs

# Starts Powers Of Tau ceremony, creating the file pot10_0000.ptau
yarn snarkjs powersoftau new bn128 10 crs/pot10_0000.ptau &> /dev/null

# Contribute to ceremony a few times...
yarn snarkjs powersoftau contribute \
    crs/pot10_0000.ptau \
    crs/pot10_0001.ptau \
    --name="First contribution" -v -e="$(head -n 4096 /dev/urandom | openssl sha1)" \
    &> /dev/null

yarn snarkjs powersoftau contribute \
    crs/pot10_0001.ptau \
    crs/pot10_0002.ptau \
    --name="Second contribution" -v -e="$(head -n 4096 /dev/urandom | openssl sha1)" \
    &> /dev/null

yarn snarkjs powersoftau contribute \
    crs/pot10_0002.ptau \
    crs/pot10_0003.ptau \
    --name="Third contribution" -v -e="$(head -n 4096 /dev/urandom | openssl sha1)" \
    &> /dev/null

# Verify contributions
yarn snarkjs powersoftau verify crs/pot10_0003.ptau \
    &> /dev/null

# Apply random beacon to finalize phase 1 of setup
yarn snarkjs powersoftau beacon \
    crs/pot10_0003.ptau \
    crs/pot10_beacon.ptau \
    0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon" \
    &> /dev/null

# Prepare phase 2
yarn snarkjs powersoftau prepare phase2 crs/pot10_beacon.ptau crs/pot10_final.ptau -v \
    &> /dev/null

# Verify phase 2 
yarn snarkjs powersoftau verify crs/pot10_final.ptau \
    &> /dev/null

# Move ptau to artifacts folder
mv crs/pot10_final.ptau artifacts/pot10_final.ptau \
    &> /dev/null

echo -e "${GREEN}crs.sh${NC}| generated Powers of Tau file at ${CYAN}$(pwd)/artifacts/pot10_final.ptau${NC}"