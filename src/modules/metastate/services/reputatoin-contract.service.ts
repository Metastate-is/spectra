import { Injectable, Logger } from "@nestjs/common";
import { JsonRpcProvider, ethers } from "ethers";
import { formatBytes32String } from "@ethersproject/strings";
import abi from "../../../../artifacts/contracts/ReputationStorage.sol/ReputationStorage.json";
import { ConfigService } from "@nestjs/config";
import { SafeTransactionService } from "./safe-transaction.service";

@Injectable()
export class ReputationContractService {
  private readonly logger = new Logger(ReputationContractService.name);
  private readonly contract: ethers.Contract;

  constructor(private readonly configService: ConfigService, private readonly safeTransactionService: SafeTransactionService) {
    const rpcUrl = this.configService.get<string>("RPC_URL");
    const privateKey = this.configService.get<string>("RPC_PRIVATE_KEY");
    const contractAddress = this.configService.get<string>("REPUTATION_CONTRACT_ADDRESS");

    if (!rpcUrl || !privateKey || !contractAddress) {
      this.logger.error("Missing blockchain configuration variables");

      return;
    }

    try {
      const provider = new JsonRpcProvider(rpcUrl);
      const signer = new ethers.Wallet(privateKey, provider);

      this.contract = new ethers.Contract(contractAddress, abi.abi, signer);
    } catch (error) {
      this.logger.error("Failed to initialize reputation contract", error);
    }
  }

  async storeOrUpdateMark(
    fromParticipantId: string,
    toParticipantId: string,
    value: boolean,
    markType: string
  ): Promise<void> {
    this.logger.log("Storing mark onchain...");
    await this.safeTransactionService.sendTransactionWithRetry(() => {
      const formatMarkType = formatBytes32String(markType)
      const formatfromParticipantId = formatBytes32String(fromParticipantId);
      const formatToParticipantId = formatBytes32String(toParticipantId);
    
      return this.contract.storeOrUpdateMark(formatfromParticipantId, formatToParticipantId, value, formatMarkType)  
    });
    this.logger.log("Mark stored onchain");
  }
}
