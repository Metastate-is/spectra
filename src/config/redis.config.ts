import { registerAs } from "@nestjs/config";
import { RedisClientType } from "redis";

/**
 * Конфигурация Redis для кэширования
 *
 * @property url - URL подключения к Redis в формате redis://:password@host:port
 * @property ttl - Время жизни кэша по умолчанию в секундах
 * @property retryAttempts - Количество попыток переподключения
 * @property retryDelay - Задержка между попытками в миллисекундах
 */
export default registerAs("redis", () => ({
  // URL подключения к Redis, включая пароль
  url: process.env.REDIS_URL,

  // Время жизни кэша по умолчанию (1 час)
  ttl: 3600,

  // Настройки переподключения при ошибках
  retryAttempts: 5,
  retryDelay: 1000,

  // Обработка ошибок подключения
  onClientReady: (client: RedisClientType) => {
    client.on("error", (err: Error) => {
      // В тестовом окружении выводим ошибки в консоль
      if (process.env.NODE_ENV === "test") {
        console.error("Redis Client Error:", err);
      }
    });

    client.on("connect", () => {
      if (process.env.NODE_ENV === "test") {
        console.log("Redis Client Connected");
      }
    });

    client.on("reconnecting", () => {
      if (process.env.NODE_ENV === "test") {
        console.log("Redis Client Reconnecting...");
      }
    });
  },
}));
