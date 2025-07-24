import { Module } from "@nestjs/common";
import { KafkaModule } from "src/core/kafka/kafka.module";
import { RedisModule } from "src/core/redis/redis.module";
import { OffchainModule } from "../offchain/offchain.module";
import { OnchainModule } from "../onchain/onchain.module";
import { EventsCache } from "./events-cache";
import { MarkHandler } from "./mark.handler";

@Module({
  imports: [KafkaModule, RedisModule, OnchainModule, OffchainModule],
  controllers: [MarkHandler],
  providers: [EventsCache],
  exports: [EventsCache],
})
export class EventsModule {}
