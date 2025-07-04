import { CacheModule } from "@nestjs/cache-manager";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { RedisService } from "./redis.service";

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: require("cache-manager-redis-store"),
        url: configService.get("redis.url"),
        ttl: configService.get("redis.ttl"),
        retryAttempts: configService.get("redis.retryAttempts"),
        retryDelay: configService.get("redis.retryDelay"),
        onClientReady: configService.get("redis.onClientReady"),
      }),
      inject: [ConfigService],
      isGlobal: true,
    }),
  ],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
