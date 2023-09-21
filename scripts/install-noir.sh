#!/bin/bash

GREEN='\033[0;32m'
NC='\033[0m'

# Check if nargo exists
if ! command -v nargo &> /dev/null; then
    echo -e "${GREEN}install-noir.sh ${NC}| Nargo installation not detected, installing..."
    # https://github.com/noir-lang/noirup#installing
    curl https://raw.githubusercontent.com/noir-lang/noirup/main/install -o installer.sh -L &> /dev/null
    chmod +x installer.sh
    ./installer.sh &> /dev/null
    rm installer.sh
    source ~/.bashrc
    noirup -v 0.10.5 &> /dev/null
fi

# Check if the right version of nargo exists
output=$(nargo -V)

# Check if the output starts with "nargo 0.10.5"
if ! [[ $output == nargo\ 0.10.5* ]]; then
    echo -e "${GREEN}install-noir.sh ${NC}| Nargo version mismatch, installing 0.10.5..."

    noirup -v 0.10.5 &> /dev/null
fi

echo -e "${GREEN}install-noir.sh ${NC}| Noir compiler version 0.10.5 is installed"
