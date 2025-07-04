import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ClientsModule } from "@nestjs/microservices";
import { KafkaService } from "./kafka.service";

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: "KAFKA_CLIENT",
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => {
          const kafkaConfig = configService.get("kafka");
          if (!kafkaConfig) {
            throw new Error("Kafka configuration is missing");
          }
          return kafkaConfig.getClientOptions();
        },
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [KafkaService],
  exports: [KafkaService],
})
export class KafkaModule {}
