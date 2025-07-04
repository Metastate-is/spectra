import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import { Cache } from "cache-manager";
import { StructuredLoggerService } from "../logger";

@Injectable()
export class RedisService {
  private readonly l = new StructuredLoggerService();

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    this.l.setContext(RedisService.name);
  }

  /**
   * Получение данных из кэша
   * @param key - Ключ кэша
   * @returns Данные из кэша или null, если данных нет
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      return value ?? null;
    } catch (error) {
      this.l.error("Ошибка при получении данных из кэша", error as Error, {
        meta: { key },
      });
      return null;
    }
  }

  /**
   * Сохранение данных в кэш
   * @param key - Ключ кэша
   * @param value - Значение для сохранения
   * @param ttl - Время жизни кэша в секундах (опционально)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      this.l.error("Ошибка при сохранении данных в кэш", error as Error, {
        meta: { key, ttl },
      });
      throw error;
    }
  }

  /**
   * Удаление данных из кэша
   * @param key - Ключ кэша
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.l.error("Ошибка при удалении данных из кэша", error as Error, {
        meta: { key },
      });
      throw error;
    }
  }

  /**
   * Удаление всех ключей, соответствующих паттерну
   * @param pattern - Паттерн для поиска ключей
   */
  async clear(pattern: string): Promise<void> {
    try {
      // В текущей версии cache-manager нет прямого метода для очистки по паттерну
      // Поэтому мы просто логируем это действие
      this.l.info("[WARN] Очистка кэша по паттерну не реализована", {
        meta: { pattern },
      });
    } catch (error) {
      this.l.error("Ошибка при очистке кэша по паттерну", error as Error, {
        meta: { pattern },
      });
      throw error;
    }
  }

  /**
   * Проверка существования ключа в кэше
   * @param key - Ключ кэша
   */
  async exists(key: string): Promise<boolean> {
    try {
      const value = await this.cacheManager.get(key);
      return value !== null;
    } catch (error) {
      this.l.error("Ошибка при проверке существования ключа", error as Error, {
        meta: { key },
      });
      return false;
    }
  }
}
