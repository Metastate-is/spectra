import { registerAs } from "@nestjs/config";
import { KafkaOptions, Transport } from "@nestjs/microservices";

import { Deserializer } from '@nestjs/microservices';
import { MarkRequest } from "@metastate-is/proto-models/generated/metastate/kafka/spectra/v1/mark_request";  // Ваш proto

export class ProtobufDeserializer implements Deserializer {
  deserialize(value: any, options?: any): any {
    console.log('Deserializer: Raw value length:', value);  // Длина bytes
    if (!value) return null;
    try {
      // Декодируем protobuf в объект
      return MarkRequest.decode(value);
    } catch (error) {
      console.error('Protobuf deserialization error:', error);
      throw error;  // Или return null, чтобы не крашить
    }
  }
}

/**
 * Конфигурация Kafka для микросервисной архитектуры
 *
 * @property clientId - Идентификатор клиента Kafka
 * @property brokers - Массив адресов брокеров Kafka
 * @property groupId - Идентификатор группы потребителей
 * @property ssl - Использовать ли SSL для подключения
 * @property sasl - Настройки аутентификации SASL (если используется)
 * @property disabled - Отключить подключение к Kafka
 */
export default registerAs("kafka", () => ({
  // Флаг отключения Kafka (для разработки или если Kafka недоступна)
  disabled: process.env.KAFKA_DISABLED === "true",

  // Настройки клиента Kafka
  clientId: process.env.KAFKA_CLIENT_ID || "spectra",
  brokers: ['localhost:9092'],
  groupId: process.env.KAFKA_GROUP_ID || "spectra-group",

  // Настройки SSL (для продакшн)
  ssl: process.env.KAFKA_SSL === "true",

  // Настройки SASL (для продакшн)
  sasl:
    process.env.KAFKA_SASL === "true"
      ? {
          mechanism: process.env.KAFKA_SASL_MECHANISM || "plain",
          username: process.env.KAFKA_SASL_USERNAME || "",
          password: process.env.KAFKA_SASL_PASSWORD || "",
        }
      : undefined,

  // Настройки для NestJS микросервисов
  getClientOptions(): KafkaOptions {
    return {
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: this.clientId,
          brokers: this.brokers,
          ssl: this.ssl,
          ...(this.sasl && { sasl: this.sasl }),
        },
        consumer: {
          groupId: this.groupId,
        },
        deserializer: new ProtobufDeserializer(),
      },
    };
  },
}));
