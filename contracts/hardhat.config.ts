import "dotenv/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-verify";
import {
    HardhatUserConfig,
    SolcUserConfig,
    HttpNetworkUserConfig,
    HDAccountsUserConfig,
} from "hardhat/types";

const { INFURA, MNEMONIC } = process.env;

const RPCS: { [key: string]: string } = {
    goerli: `https://goerli.infura.io/v3/${INFURA}`,
    sepolia: `https://sepolia.infura.io/v3/${INFURA}`,
    optimism: `https://optimism-mainnet.infura.io/v3/${INFURA}`,
    arbitrum: `https://arbitrum-mainnet.infura.io/v3/${INFURA}`,
    mainnet: `https://mainnet.infura.io/v3/${INFURA}`,
};

const accounts: HDAccountsUserConfig = {
    mnemonic: MNEMONIC!,
    path: "m/44'/60'/0'/0",
    initialIndex: 0,
    count: 10,
};

/**
 * Return hardhat compiler object for a given compilation target
 * @param version - the version of solc to use
 * @returns - the hardhat solc compiler config object
 */
const makeCompiler = (version: string) : SolcUserConfig => {
    return {
        version,
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    };
}

/**
 * Return hardhat network object for a given network
 * @param network - string name of the network
 * @returns - the formatted hardhat network config object
 */
const makeNetwork = (network: string) : HttpNetworkUserConfig => {
    return {
        url: RPCS[network],
        accounts,
    };
}

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            makeCompiler("0.8.21"),
            makeCompiler("0.7.3"),
        ],
    },
    networks: {
        goerli: makeNetwork("goerli"),
        sepolia: makeNetwork("sepolia"),
        optimism: makeNetwork("optimism"),
        arbitrum: makeNetwork("arbitrum"),
        mainnet: makeNetwork("mainnet"),
        localhost: {
            url: "http://localhost:8545",
            accounts: ["ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"],
        },
    },
    mocha: {
        timeout: 200000,
    },
    etherscan: {
        apiKey: {
            goerli: process.env.ETHERSCAN!,
            sepolia: process.env.ETHERSCAN!,
            mainnet: process.env.ETHERSCAN!,
        }
    }
};

export default config;