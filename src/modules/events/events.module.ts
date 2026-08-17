import { Module } from "@nestjs/common";
import { InternalHttpModule } from "src/core/internal-http/internal-http.module";
import { RedisModule } from "src/core/redis/redis.module";
import { OffchainModule } from "../offchain/offchain.module";
import { OnchainModule } from "../onchain/onchain.module";
import { EventsCache } from "./events-cache";
import { MarkHandler } from "./mark.handler";

@Module({
  imports: [InternalHttpModule, RedisModule, OnchainModule, OffchainModule],
  controllers: [MarkHandler],
  providers: [EventsCache],
  exports: [EventsCache],
})
export class EventsModule {}
