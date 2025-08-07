import { Global, Module } from "@nestjs/common";
import { ReputationContractService } from "./services/reputatoin-contract.service";
import { SafeTransactionService } from "./services/safe-transaction.service";

@Global()
@Module({
  providers: [ReputationContractService, SafeTransactionService],
  exports: [ReputationContractService],
})
export class MetastateModule {}
