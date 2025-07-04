import { Module } from "@nestjs/common";
import { KafkaModule } from "src/core/kafka/kafka.module";
import { MarkHandler } from "./mark.handler";
import { RedisModule } from "src/core/redis/redis.module";
import { EventsCache } from "./events-cache";
import { OnchainModule } from "../onchain/onchain.module";
import { OffchainModule } from "../offchain/offchain.module";

@Module({
  imports: [KafkaModule, RedisModule, OnchainModule, OffchainModule],
  providers: [MarkHandler, EventsCache],
})
export class EventsModule {}
