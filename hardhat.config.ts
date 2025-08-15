import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    metastate: {
      url: process.env.RPC_URL || "https://rpc-node.metastate.is/",
      accounts: [process.env.RPC_PRIVATE_KEY!],
      chainId: Number(process.env.RPC_CHAIN_ID || 55681)
    },
  },
};

export default config;
