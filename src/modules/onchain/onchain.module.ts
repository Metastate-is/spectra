import { Global, Module } from "@nestjs/common";
import { KafkaModule } from "src/core/kafka/kafka.module";
import { OnchainService } from "./onchain.service";

@Global()
@Module({
  imports: [KafkaModule],
  providers: [OnchainService],
  exports: [OnchainService],
})
export class OnchainModule {}
