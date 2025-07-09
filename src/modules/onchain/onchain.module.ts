import { Global, Module } from "@nestjs/common";
import { OnchainService } from "./onchain.service";
import { KafkaModule } from "src/core/kafka/kafka.module";

@Global()
@Module({
  imports: [KafkaModule],
  providers: [OnchainService],
  exports: [OnchainService],
})
export class OnchainModule {}
