import { registerAs } from "@nestjs/config";
import { KafkaOptions, Transport } from "@nestjs/microservices";

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
  brokers: [process.env.KAFKA_BROKERS || "localhost:9092"],
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
      },
    };
  },
}));
