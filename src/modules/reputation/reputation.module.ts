import { Module } from "@nestjs/common";
import { OffchainModule } from "../offchain/offchain.module";
import { OnchainModule } from "../onchain/onchain.module";
import { ReputationController } from "./reputation.service";

@Module({
  imports: [OnchainModule, OffchainModule],
  controllers: [ReputationController],
})
export class ReputationModule {}
