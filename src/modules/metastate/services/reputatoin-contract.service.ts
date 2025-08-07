import { Injectable, Logger } from "@nestjs/common";
import { ethers, JsonRpcProvider } from "ethers";
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

    const provider = new JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    this.contract = new ethers.Contract(contractAddress, abi.abi, signer);
  }

  async storeMark(
    fromParticipantId: number,
    toParticipantId: number,
    value: boolean,
    markType: string
  ): Promise<void> {
    this.logger.log("Storing mark onchain...");
    await this.safeTransactionService.sendTransactionWithRetry(() =>
      this.contract.storeMark(fromParticipantId, toParticipantId, value, markType)
    );
    this.logger.log("Mark stored onchain");
  }
}
