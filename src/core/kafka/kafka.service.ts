import { KAFKA_TOPICS } from "@metastate-is/proto-models";
import { MarkCreated } from "@metastate-is/proto-models/generated/metastate/kafka/spectra/v1/mark_created";
import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { StructuredLoggerService } from "../logger";

/**
 * Сервис для работы с Kafka
 */
@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly l = new StructuredLoggerService();

  constructor(
    @Inject("KAFKA_CLIENT")
    private readonly kafkaClient: ClientKafka,
  ) {
    this.l.setContext("KafkaService");
  }

  /**
   * Инициализация клиента Kafka при запуске модуля
   */
  async onModuleInit() {
    // Проверяем, отключено ли подключение к Kafka
    const kafkaDisabled = process.env.KAFKA_DISABLED === "true";
    if (kafkaDisabled) {
      this.l.info("[WARN] Kafka client connection is disabled by configuration");
      return;
    }

    try {
      // Добавляем таймаут для подключения к Kafka
      const connectPromise = this.kafkaClient.connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Kafka connection timeout")), 5000); // 5 секунд таймаут
      });

      await Promise.race([connectPromise, timeoutPromise])
        .then(() => {
          this.l.info("Kafka client connected successfully");
        })
        .catch((error) => {
          this.l.error("Failed to connect to Kafka", error as Error, {
            meta: { timeoutMs: 5000 },
          });
          this.l.info("[WARN] Server will continue to start without Kafka connection");
        });
    } catch (error) {
      this.l.error("Failed to connect to Kafka", error as Error);
      this.l.info("[WARN] Server will continue to start without Kafka connection");
    }
  }

  /**
   * Отключение клиента Kafka при остановке модуля
   */
  async onModuleDestroy() {
    try {
      await this.kafkaClient.close();
      this.l.info("Kafka client disconnected successfully");
    } catch (error) {
      this.l.error("Failed to disconnect from Kafka", error as Error);
    }
  }

  /**
   * Публикует сообщение в Kafka
   * @param topic Топик для публикации
   * @param message Сообщение для публикации
   */
  public async emit<T>(topic: string, message: T): Promise<void> {
    try {
      this.l.debug(`Отправка сообщения в топик ${topic}`, {
        meta: {
          topic,
          message: typeof message === "object" ? JSON.stringify(message) : message,
        },
      });

      // Здесь будет реальная логика публикации сообщения в Kafka
      // TODO: Реализовать интеграцию с Kafka клиентом

      this.l.debug(`Сообщение успешно отправлено в топик ${topic}`);
    } catch (error) {
      this.l.error(`Ошибка при отправке сообщения в топик ${topic}`, error as Error, {
        meta: { topic },
      });
    }
  }

  /**
   * Отправка сообщения в Kafka
   * @param topic Топик Kafka
   * @param message Сообщение для отправки
   * @returns Promise<RecordMetadata> Метаданные записи
   */
  async send<T>(topic: string, message: T): Promise<any> {
    // Проверяем, отключено ли подключение к Kafka
    const kafkaDisabled = process.env.KAFKA_DISABLED === "true";
    if (kafkaDisabled) {
      this.l.info(`[WARN] Kafka disabled: Message to topic ${topic} not sent`);
      return null;
    }

    try {
      // Проверяем состояние клиента Kafka
      try {
        await this.kafkaClient.connect();
      } catch (_) {
        this.l.info(`[WARN] Kafka connection failed: Message to topic ${topic} not sent`);
        return null;
      }

      this.l.debug("Sending message to Kafka topic", {
        meta: { topic, message },
      });

      const result = await this.kafkaClient.emit(topic, message).toPromise();

      this.l.debug("Message sent to Kafka successfully", {
        meta: { topic, result },
      });

      return result;
    } catch (error) {
      this.l.error("Failed to send message to Kafka topic", error as Error, {
        meta: { topic },
      });
      // Не пробрасываем ошибку дальше, чтобы не блокировать работу приложения
      return null;
    }
  }

  /**
   * Отправка сообщения о создании достижения
   * @param markCreatedMessage Сообщение о создании достижения
   * @returns Promise<RecordMetadata> Метаданные записи
   */
  async sendMarkCreated(markCreatedMessage: MarkCreated): Promise<any> {
    const topic = KAFKA_TOPICS.SPECTRA.MARK.CREATED;

    this.l.info("Sending mark created message to Kafka", {
      meta: { topic, message: markCreatedMessage },
    });

    try {
      const result = await this.send(topic, Buffer.from(JSON.stringify(markCreatedMessage)));
      if (result) {
        this.l.info("Mark created message sent successfully", {
          meta: { result },
        });
      } else {
        this.l.info("[WARN] Mark created message was not sent to Kafka");
      }
      return result;
    } catch (error) {
      this.l.error("Failed to send mark created message", error as Error);
      // Не пробрасываем ошибку дальше, чтобы не блокировать работу приложения
      return null;
    }
  }
}
