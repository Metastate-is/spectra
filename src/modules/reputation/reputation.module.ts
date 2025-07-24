import { Module } from "@nestjs/common";
import { ReputationController } from "./reputation.service";
import { OnchainModule } from "../onchain/onchain.module";
import { OffchainModule } from "../offchain/offchain.module";

@Module({
  imports: [OnchainModule, OffchainModule],
  controllers: [ReputationController]
})
export class ReputationModule {}
