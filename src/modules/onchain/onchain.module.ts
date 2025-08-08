import { Global, Module } from "@nestjs/common";
import { KafkaModule } from "src/core/kafka/kafka.module";
import { OnchainService } from "./onchain.service";
import { MetastateModule } from "../metastate/metastate.module";

@Global()
@Module({
  imports: [KafkaModule, MetastateModule],
  providers: [OnchainService],
  exports: [OnchainService],
})
export class OnchainModule {}
