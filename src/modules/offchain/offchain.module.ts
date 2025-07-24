import { Global, Module } from "@nestjs/common";
import { KafkaModule } from "src/core/kafka/kafka.module";
import { OffchainService } from "./offchain.service";

@Global()
@Module({
  imports: [KafkaModule],
  providers: [OffchainService],
  exports: [OffchainService],
})
export class OffchainModule {}
