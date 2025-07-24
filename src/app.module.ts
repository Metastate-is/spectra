import { CacheModule } from "@nestjs/cache-manager";
import { Module, NestModule, ValidationPipe } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_PIPE } from "@nestjs/core";
import kafkaConfig from "./config/kafka.config";
import loggerConfig from "./config/logger.config";
import redisConfig from "./config/redis.config";
import neo4jConfig from "./config/neo4j.config";
import { LoggerModule } from "./core/logger";
import { RedisModule } from "./core/redis/redis.module";
import { TelemetryModule } from "./core/telemetry/telemetry.module";
import { Neo4jModule } from "./core/neo4j/neo4j.module";
import { OnchainModule } from "./modules/onchain/onchain.module";
import { OffchainModule } from "./modules/offchain/offchain.module";
import { AppController } from "./app.controller";
import { EventsModule } from "./modules/events/events.module";
import { KafkaModule } from "./core/kafka/kafka.module";
import { grpcListenerConfig } from "./config/grpc.config";
import { ReputationModule } from "./modules/reputation/reputation.module";

if (process.env.NODE_ENV === "test") {
  // Динамический импорт только в тестовой среде
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("../test/setup");
}

const imports = [
  ConfigModule.forRoot({
    load: [
      redisConfig,
      kafkaConfig,
      loggerConfig,
      neo4jConfig,
      grpcListenerConfig
    ],
    isGlobal: true,
  }),
  // Добавляем модуль логирования
  LoggerModule,
  // Добавляем модуль телеметрии
  TelemetryModule.forRoot(),
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
  KafkaModule,
  RedisModule,
  Neo4jModule.forRootAsync(),
  ReputationModule,
  OnchainModule,
  OffchainModule,
  EventsModule,
];

@Module({
  imports,
  controllers: [AppController],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
      }),
    },
  ],
})
export class AppModule implements NestModule {
  configure() {}
}
