import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    metastate: {
      url: process.env.RPC_URL,
      accounts: [process.env.RPC_PRIVATE_KEY!],
      chainId: 55681
    },
  },
};

export default config;
