import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ReputationContractService } from "./services/reputatoin-contract.service";
import { SafeTransactionService } from "./services/safe-transaction.service";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [ReputationContractService, SafeTransactionService],
  exports: [ReputationContractService],
})
export class MetastateModule {}
