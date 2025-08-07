import { CacheModule } from "@nestjs/cache-manager";
import { Module, NestModule, ValidationPipe } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_PIPE } from "@nestjs/core";
import { AppController } from "./app.controller";
import { grpcListenerConfig } from "./config/grpc.config";
import kafkaConfig from "./config/kafka.config";
import loggerConfig from "./config/logger.config";
import neo4jConfig from "./config/neo4j.config";
import redisConfig from "./config/redis.config";
import metastateConfig from "./config/metastate.config";
import { KafkaModule } from "./core/kafka/kafka.module";
import { LoggerModule } from "./core/logger";
import { Neo4jModule } from "./core/neo4j/neo4j.module";
import { RedisModule } from "./core/redis/redis.module";
import { TelemetryModule } from "./core/telemetry/telemetry.module";
import { EventsModule } from "./modules/events/events.module";
import { HealthModule } from "./modules/health/health.module";
import { OffchainModule } from "./modules/offchain/offchain.module";
import { OnchainModule } from "./modules/onchain/onchain.module";
import { ReputationModule } from "./modules/reputation/reputation.module";
import { MetastateModule } from "./modules/metastate/metastate.module";

if (process.env.NODE_ENV === "test") {
  // Динамический импорт только в тестовой среде
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("../test/setup");
}

const imports = [
  ConfigModule.forRoot({
    load: [redisConfig, kafkaConfig, loggerConfig, neo4jConfig, grpcListenerConfig, metastateConfig],
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
  HealthModule,
  MetastateModule
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
