import { Global, Module } from "@nestjs/common";
import { OffchainService } from "./offchain.service";
import { KafkaModule } from "src/core/kafka/kafka.module";

@Global()
@Module({
  imports: [KafkaModule],
  providers: [OffchainService],
  exports: [OffchainService],
})
export class OffchainModule {}
